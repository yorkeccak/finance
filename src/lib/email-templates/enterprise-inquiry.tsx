interface EnterpriseInquiryEmailProps {
  companyName: string;
  companySize?: string;
  industry?: string;
  contactName: string;
  contactEmail: string;
  jobTitle: string;
  useCase: string;
  bookedCall: boolean;
}

export function EnterpriseInquiryEmail({
  companyName,
  companySize,
  industry,
  contactName,
  contactEmail,
  jobTitle,
  useCase,
  bookedCall
}: EnterpriseInquiryEmailProps) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enterprise Inquiry - ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="margin-bottom: 32px;">
      <h1 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 600; color: #000000;">Finance</h1>
      <p style="margin: 0; font-size: 14px; color: #666666;">New Enterprise Inquiry${bookedCall ? ' • Call Booked' : ''}</p>
    </div>

    <!-- Company -->
    <div style="margin-bottom: 24px;">
      <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 500; color: #999999; text-transform: uppercase; letter-spacing: 0.5px;">Company</p>
      <p style="margin: 0 0 2px 0; font-size: 16px; font-weight: 600; color: #000000;">${companyName}</p>
      ${companySize ? `<p style="margin: 0; font-size: 14px; color: #666666;">${companySize}${industry ? ' • ' + industry : ''}</p>` : (industry ? `<p style="margin: 0; font-size: 14px; color: #666666;">${industry}</p>` : '')}
    </div>

    <!-- Contact -->
    <div style="margin-bottom: 24px;">
      <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 500; color: #999999; text-transform: uppercase; letter-spacing: 0.5px;">Contact</p>
      <p style="margin: 0 0 2px 0; font-size: 16px; font-weight: 600; color: #000000;">${contactName}${jobTitle ? ' • ' + jobTitle : ''}</p>
      <p style="margin: 0; font-size: 14px;"><a href="mailto:${contactEmail}" style="color: #000000; text-decoration: none;">${contactEmail}</a></p>
    </div>

    <!-- Use Case -->
    <div style="margin-bottom: 32px;">
      <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 500; color: #999999; text-transform: uppercase; letter-spacing: 0.5px;">Use Case</p>
      <p style="margin: 0; font-size: 14px; color: #000000; line-height: 1.6; white-space: pre-wrap;">${useCase}</p>
    </div>

    <!-- Divider -->
    <div style="height: 1px; background-color: #e5e7eb; margin: 32px 0;"></div>

    <!-- CTA -->
    <div>
      <a href="mailto:${contactEmail}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500; margin-right: 8px;">Reply</a>
      ${bookedCall ? `<a href="https://calendly.com/henk-valyu" style="display: inline-block; background-color: #ffffff; color: #000000; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500; border: 1px solid #e5e7eb;">Calendly</a>` : ''}
    </div>

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #999999;">Finance by Valyu</p>
    </div>

  </div>
</body>
</html>
  `.trim();
}
