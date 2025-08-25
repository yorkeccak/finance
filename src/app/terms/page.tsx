export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Terms of Service</h1>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            Last updated: January 2025
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 dark:text-gray-300">
              By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Our service provides AI-powered financial analysis and research tools using:
            </p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>OpenAI GPT-5 for natural language processing</li>
              <li>Valyu API for data search and retrieval</li>
              <li>Daytona for code execution</li>
              <li>Supabase for authentication and data storage</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">3. User Obligations</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">You agree to:</p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Use the service only for lawful purposes</li>
              <li>Not attempt to gain unauthorized access to our systems</li>
              <li>Not violate any applicable laws or regulations</li>
              <li>Respect intellectual property rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">4. Payment Terms</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We offer multiple subscription plans:
            </p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>Free tier with limited usage</li>
              <li>Pay-per-use pricing for individual features</li>
              <li>Unlimited plans for unrestricted access</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              Payment is processed through secure third-party payment processors. All fees are non-refundable unless required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">5. Intellectual Property</h2>
            <p className="text-gray-700 dark:text-gray-300">
              All content, features, and functionality of our service are owned by Valyu.Network LTD and are protected by international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">6. Disclaimer of Warranties</h2>
            <p className="text-gray-700 dark:text-gray-300">
              The service is provided &quot;as is&quot; without any warranties, express or implied. We do not guarantee that the service will be uninterrupted or error-free. Financial information should not be considered as investment advice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">7. Limitation of Liability</h2>
            <p className="text-gray-700 dark:text-gray-300">
              In no event shall Valyu.Network LTD be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">8. Termination</h2>
            <p className="text-gray-700 dark:text-gray-300">
              We may terminate or suspend your account and access to the service immediately, without prior notice, for any reason, including breach of these terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">9. Governing Law</h2>
            <p className="text-gray-700 dark:text-gray-300">
              These terms shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">10. Contact Information</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Valyu.Network LTD<br />
              17 Hanover Square<br />
              London W1S 1BN<br />
              United Kingdom
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">11. Changes to Terms</h2>
            <p className="text-gray-700 dark:text-gray-300">
              We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the service constitutes acceptance of the modified terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}