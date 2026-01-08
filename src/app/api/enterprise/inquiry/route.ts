import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { EnterpriseInquiryEmail } from '@/lib/email-templates/enterprise-inquiry';

const ENTERPRISE_RECIPIENTS = [
  'harvey@valyu.ai',
  'hirsh@valyu.ai',
  'alexander.ng@valyu.ai',
  'henk@valyu.ai'
];

export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = await req.json();

    const {
      companyName,
      companySize,
      industry,
      contactName,
      contactEmail,
      jobTitle,
      useCase,
      bookedCall
    } = body;

    // Validate required fields
    if (!companyName || !contactName || !contactEmail || !jobTitle || !useCase) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Generate email HTML
    const emailHtml = EnterpriseInquiryEmail({
      companyName,
      companySize,
      industry,
      contactName,
      contactEmail,
      jobTitle,
      useCase,
      bookedCall: bookedCall || false
    });

    // Send email to Valyu team
    await resend.emails.send({
      from: 'Finance Enterprise <support@valyu.ai>',
      to: ENTERPRISE_RECIPIENTS,
      replyTo: contactEmail,
      subject: `🏢 Enterprise Inquiry from Finance App - ${companyName}`,
      html: emailHtml
    });

    // Track event in PostHog if available
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('enterprise_inquiry_submitted', {
        companyName,
        companySize,
        industry,
        jobTitle,
        bookedCall
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Enterprise inquiry submitted successfully'
    });

  } catch (error) {
    console.error('[Enterprise Inquiry API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit enterprise inquiry' },
      { status: 500 }
    );
  }
}
