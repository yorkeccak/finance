import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Valyu OAuth Session Creation
 *
 * After OAuth token exchange, this endpoint:
 * 1. Fetches user info from Valyu using the access token
 * 2. Creates or finds the user in Finance App's Supabase
 * 3. Creates a session for that user
 * 4. Returns session tokens that can be used with Supabase client
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// Support both VALYU_APP_URL (server) and NEXT_PUBLIC_VALYU_APP_URL (client)
const VALYU_APP_URL = process.env.VALYU_APP_URL || process.env.NEXT_PUBLIC_VALYU_APP_URL || 'https://platform.valyu.ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { valyu_access_token } = body;

    if (!valyu_access_token) {
      return NextResponse.json(
        { error: 'missing_token', error_description: 'valyu_access_token is required' },
        { status: 400 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Valyu Session] Missing Supabase configuration');
      return NextResponse.json(
        { error: 'server_error', error_description: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // 1. Fetch user info from Valyu
    const userinfoUrl = `${VALYU_APP_URL}/api/oauth/userinfo`;
    console.log('[Valyu Session] Fetching userinfo from:', userinfoUrl);

    const userInfoResponse = await fetch(userinfoUrl, {
      headers: {
        'Authorization': `Bearer ${valyu_access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('[Valyu Session] Failed to fetch user info:', userInfoResponse.status, errorText.substring(0, 200));
      return NextResponse.json(
        { error: 'userinfo_failed', error_description: 'Failed to fetch user info from Valyu' },
        { status: 401 }
      );
    }

    const valyuUser = await userInfoResponse.json();
    console.log('[Valyu Session] Got user info:', {
      sub: valyuUser.sub,
      email: valyuUser.email,
      name: valyuUser.name
    });

    if (!valyuUser.email) {
      return NextResponse.json(
        { error: 'missing_email', error_description: 'Valyu user does not have an email' },
        { status: 400 }
      );
    }

    // 2. Create admin Supabase client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 3. Try to create user first, handle email_exists by looking up existing user
    let userId: string;

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: valyuUser.email,
      email_confirm: true, // Auto-confirm since Valyu already verified
      user_metadata: {
        valyu_sub: valyuUser.sub,
        full_name: valyuUser.name || valyuUser.given_name,
        avatar_url: valyuUser.picture,
        valyu_user_type: valyuUser.valyu_user_type,
        valyu_organisation_id: valyuUser.valyu_organisation_id,
        valyu_organisation_name: valyuUser.valyu_organisation_name,
      },
    });

    if (createError) {
      // Check if user already exists (handle both error code and message)
      const isEmailExists = createError.code === 'email_exists' ||
        createError.message?.includes('already been registered');

      if (isEmailExists) {
        console.log('[Valyu Session] User exists, looking up by email...');

        // Find existing user by paginating through all users
        // This is inefficient but Supabase Admin API doesn't have getUserByEmail
        let page = 1;
        let foundUser = null;

        while (!foundUser) {
          const { data: usersPage, error: listError } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage: 1000,
          });

          if (listError || !usersPage?.users?.length) {
            break;
          }

          foundUser = usersPage.users.find(u => u.email === valyuUser.email);
          page++;

          // Safety limit
          if (page > 10) break;
        }

        if (!foundUser) {
          console.error('[Valyu Session] User exists but could not find them');
          return NextResponse.json(
            { error: 'user_lookup_failed', error_description: 'User exists but could not be found' },
            { status: 500 }
          );
        }

        userId = foundUser.id;
        console.log('[Valyu Session] Found existing user:', userId);

        // Update user metadata with latest Valyu info
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            valyu_sub: valyuUser.sub,
            full_name: valyuUser.name || valyuUser.given_name,
            avatar_url: valyuUser.picture,
            valyu_user_type: valyuUser.valyu_user_type,
            valyu_organisation_id: valyuUser.valyu_organisation_id,
            valyu_organisation_name: valyuUser.valyu_organisation_name,
          },
        });

        // Update users table
        const { error: upsertError } = await supabaseAdmin
          .from('users')
          .upsert({
            id: userId,
            email: valyuUser.email,
            avatar_url: valyuUser.picture,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id',
          });

        if (upsertError) {
          console.error('[Valyu Session] Failed to upsert user profile:', upsertError);
        } else {
          console.log('[Valyu Session] Updated user profile');
        }
      } else {
        // Some other error
        console.error('[Valyu Session] Failed to create user:', createError);
        return NextResponse.json(
          { error: 'create_user_failed', error_description: createError.message },
          { status: 500 }
        );
      }
    } else {
      // New user created successfully
      userId = newUser.user.id;
      console.log('[Valyu Session] Created new user:', userId);

      // Create user profile in users table
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: valyuUser.email,
          avatar_url: valyuUser.picture,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[Valyu Session] Failed to create user profile:', insertError);
      }
    }

    // 4. Generate a magic link to create a session
    // We use generateLink with type 'magiclink' to get a token we can use
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: valyuUser.email,
    });

    if (linkError) {
      console.error('[Valyu Session] Failed to generate link:', linkError);
      return NextResponse.json(
        { error: 'session_failed', error_description: linkError.message },
        { status: 500 }
      );
    }

    // Return the verification details so client can complete sign-in
    // Note: Only return token_hash, not verification_url (security: minimize exposed data)
    return NextResponse.json({
      user_id: userId,
      email: valyuUser.email,
      token_hash: linkData.properties.hashed_token,
      valyu_user: {
        sub: valyuUser.sub,
        name: valyuUser.name,
        email: valyuUser.email,
        picture: valyuUser.picture,
        valyu_user_type: valyuUser.valyu_user_type,
        valyu_organisation_id: valyuUser.valyu_organisation_id,
      },
    });
  } catch (error) {
    console.error('[Valyu Session] Unexpected error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
