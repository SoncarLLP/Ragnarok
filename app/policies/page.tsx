import Link from "next/link";

const LAST_UPDATED = "28 March 2026";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <h2 className="text-2xl font-semibold mb-1">{title}</h2>
        <p className="text-xs text-neutral-500 mb-6">Last updated: {LAST_UPDATED}</p>
        <div className="space-y-6 text-sm text-neutral-300 leading-relaxed">{children}</div>
      </div>
    </section>
  );
}

function H3({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="text-base font-semibold text-neutral-100 mt-6 mb-2 scroll-mt-24">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1.5">{children}</ul>;
}

function OL({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal pl-5 space-y-1.5">{children}</ol>;
}

function TableOfContents({ items }: { items: { href: string; label: string }[] }) {
  return (
    <nav className="mt-2 mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">
        Contents
      </p>
      <ol className="space-y-1.5 text-sm">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="text-amber-400 hover:underline">
              {item.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-amber-200 text-xs leading-relaxed">
      {children}
    </div>
  );
}

const sections = [
  { href: "#privacy",    label: "1. Privacy Policy" },
  { href: "#terms",      label: "2. Terms & Conditions" },
  { href: "#shipping",   label: "3. Shipping & Returns" },
  { href: "#cookies",    label: "4. Cookie Policy" },
  { href: "#community",  label: "5. Community Guidelines" },
  { href: "#loyalty",    label: "6. Loyalty Scheme Terms" },
];

export default function PoliciesPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="font-semibold tracking-wide">
            SONCAR
          </Link>
          <span className="text-sm text-neutral-400">Policies &amp; Legal</span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Page title */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold">Policies &amp; Legal</h1>
          <p className="mt-2 text-neutral-400 text-sm max-w-xl mx-auto">
            Everything you need to know about how SONCAR Limited operates, handles your data,
            and supports your rights as a customer and member.
          </p>
        </div>

        {/* Top navigation */}
        <nav className="mb-12 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {sections.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:border-amber-400/40 hover:bg-amber-500/5 hover:text-amber-300 transition text-center"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="space-y-10">

          {/* ──────────────────────────────────────────────────────
              1. PRIVACY POLICY
          ─────────────────────────────────────────────────────── */}
          <Section id="privacy" title="Privacy Policy">
            <Highlight>
              ⚠️ This policy is intended as a legally informed foundation based on UK GDPR and
              applicable UK law. It should be reviewed by a qualified UK solicitor before you
              rely on it fully.
            </Highlight>

            <TableOfContents items={[
              { href: "#priv-who",       label: "Who we are" },
              { href: "#priv-collect",   label: "What data we collect" },
              { href: "#priv-why",       label: "Why we collect it and our legal basis" },
              { href: "#priv-retention", label: "How long we keep your data" },
              { href: "#priv-sharing",   label: "Who we share your data with" },
              { href: "#priv-rights",    label: "Your rights under UK GDPR" },
              { href: "#priv-dsar",      label: "Data subject access requests" },
              { href: "#priv-ico",       label: "Right to complain to the ICO" },
              { href: "#priv-cookies",   label: "Cookies" },
              { href: "#priv-changes",   label: "Changes to this policy" },
            ]} />

            <H3 id="priv-who">1.1 Who We Are</H3>
            <P>
              SONCAR Limited is the data controller for personal data collected through this
              website. We are a company registered in England and Wales. Our registered address
              and contact details are available on request by emailing{" "}
              <strong>privacy@soncar.co.uk</strong>.
            </P>
            <P>
              Where this policy refers to &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;, it means SONCAR Limited. Where
              it refers to &quot;you&quot; or &quot;your&quot;, it means the individual using our website or services.
            </P>

            <H3 id="priv-collect">1.2 What Personal Data We Collect</H3>
            <P>We collect and process the following categories of personal data:</P>
            <UL>
              <li>
                <strong>Identity data:</strong> first name, last name, username, and profile
                information you choose to provide (biography, profile photo).
              </li>
              <li>
                <strong>Contact data:</strong> email address, phone number, and delivery address.
              </li>
              <li>
                <strong>Transaction data:</strong> details of products you have ordered, order
                values, order status, and payment references. We do not store card details —
                payment processing is handled by our third-party payment provider, Revolut Pay.
              </li>
              <li>
                <strong>Account and activity data:</strong> login history, loyalty points
                balance and transaction history, community posts, comments, likes, and follow
                relationships.
              </li>
              <li>
                <strong>Technical data:</strong> IP address, browser type and version, device
                type, operating system, and usage data collected via our hosting infrastructure.
              </li>
              <li>
                <strong>Cookie and tracking data:</strong> see our{" "}
                <a href="#cookies" className="text-amber-400 hover:underline">Cookie Policy</a>.
              </li>
            </UL>
            <P>
              We do not knowingly collect personal data from children under the age of 13. Our
              community section is intended for users aged 18 or over (or 16 and over with
              parental consent for account creation).
            </P>

            <H3 id="priv-why">1.3 Why We Collect It and Our Legal Basis</H3>
            <P>
              Under UK GDPR, we must have a lawful basis for processing your personal data. The
              table below sets out the purposes for which we use your data and the legal basis
              we rely on in each case.
            </P>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400">
                    <th className="text-left py-2 pr-4 font-medium">Purpose</th>
                    <th className="text-left py-2 pr-4 font-medium">Legal basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ["Creating and managing your account", "Performance of a contract"],
                    ["Processing and fulfilling your orders", "Performance of a contract"],
                    ["Managing your loyalty points and tier", "Performance of a contract"],
                    ["Sending transactional emails (order confirmations, shipping updates)", "Performance of a contract"],
                    ["Displaying your profile and community posts to other users", "Performance of a contract / Legitimate interests"],
                    ["Moderating community content", "Legitimate interests (maintaining a safe community)"],
                    ["Preventing fraud and ensuring platform security", "Legitimate interests"],
                    ["Analytics to improve our website and services", "Legitimate interests"],
                    ["Sending marketing communications (with your consent)", "Consent"],
                    ["Complying with legal obligations", "Legal obligation"],
                  ].map(([purpose, basis]) => (
                    <tr key={purpose}>
                      <td className="py-2 pr-4 text-neutral-300">{purpose}</td>
                      <td className="py-2 text-neutral-400">{basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <P>
              Where we rely on <strong>legitimate interests</strong> as our legal basis, we have
              balanced our interests against your rights and concluded that our interests do not
              override your fundamental rights and freedoms. You have the right to object to
              processing based on legitimate interests — see Section 1.5 below.
            </P>
            <P>
              Where we rely on <strong>consent</strong>, you have the right to withdraw that
              consent at any time without affecting the lawfulness of processing carried out
              before withdrawal.
            </P>

            <H3 id="priv-retention">1.4 How Long We Keep Your Data</H3>
            <UL>
              <li>
                <strong>Account data:</strong> retained for as long as your account is active.
                If you close your account, we will delete your personal data within 90 days,
                subject to any legal obligations to retain certain records.
              </li>
              <li>
                <strong>Order and transaction records:</strong> retained for 7 years to comply
                with UK tax and accounting obligations.
              </li>
              <li>
                <strong>Community content (posts, comments):</strong> deleted when you delete
                them or when your account is closed. Moderation logs may be retained for up to
                2 years.
              </li>
              <li>
                <strong>Marketing preferences and consent records:</strong> retained until you
                withdraw consent.
              </li>
              <li>
                <strong>Technical/access logs:</strong> typically retained for up to 90 days by
                our hosting provider.
              </li>
            </UL>

            <H3 id="priv-sharing">1.5 Who We Share Your Data With</H3>
            <P>
              We do not sell your personal data. We share data only with the following
              processors and service providers, under appropriate data processing agreements:
            </P>
            <UL>
              <li>
                <strong>Supabase Inc.</strong> — our database, authentication, and file storage
                provider. Data may be hosted within the EU/EEA or US (under appropriate
                safeguards). Privacy policy:{" "}
                <span className="text-neutral-400">supabase.com/privacy</span>.
              </li>
              <li>
                <strong>Vercel Inc.</strong> — our website hosting and deployment platform.
                Processes technical data including IP addresses and request logs. Privacy
                policy: <span className="text-neutral-400">vercel.com/legal/privacy-policy</span>.
              </li>
              <li>
                <strong>Revolut Pay</strong> (operated by Revolut Ltd, authorised by the FCA) —
                our payment processing provider. Processes payment card data on our behalf. We
                do not receive or store full card details. Privacy policy:{" "}
                <span className="text-neutral-400">revolut.com/legal/privacy</span>.
              </li>
            </UL>
            <P>
              We may also disclose your data where required by law, court order, or regulatory
              authority, or where necessary to protect the rights, safety, or property of
              SONCAR Limited, our customers, or others.
            </P>

            <H3 id="priv-rights">1.6 Your Rights Under UK GDPR</H3>
            <P>You have the following rights in relation to your personal data:</P>
            <UL>
              <li>
                <strong>Right of access:</strong> to obtain a copy of the personal data we hold
                about you (see Section 1.7 below).
              </li>
              <li>
                <strong>Right to rectification:</strong> to have inaccurate data corrected or
                incomplete data completed.
              </li>
              <li>
                <strong>Right to erasure (&quot;right to be forgotten&quot;):</strong> to request deletion
                of your personal data in certain circumstances, for example where the data is no
                longer necessary for the purpose it was collected.
              </li>
              <li>
                <strong>Right to restriction of processing:</strong> to request that we limit
                how we use your data in certain circumstances.
              </li>
              <li>
                <strong>Right to data portability:</strong> to receive your data in a structured,
                commonly used, machine-readable format and to transmit it to another controller,
                where technically feasible.
              </li>
              <li>
                <strong>Right to object:</strong> to object to processing based on legitimate
                interests or for direct marketing purposes.
              </li>
              <li>
                <strong>Rights in relation to automated decision-making:</strong> we do not
                currently make solely automated decisions that produce legal or similarly
                significant effects on you.
              </li>
            </UL>
            <P>
              To exercise any of these rights, please contact us at{" "}
              <strong>privacy@soncar.co.uk</strong>. We will respond within one month. We may
              need to verify your identity before acting on your request.
            </P>

            <H3 id="priv-dsar">1.7 Data Subject Access Requests (DSARs)</H3>
            <P>
              You have the right to request a copy of all personal data we hold about you free
              of charge. To submit a DSAR, please email <strong>privacy@soncar.co.uk</strong>{" "}
              with the subject line &quot;Data Subject Access Request&quot; and include your full name,
              email address associated with your account, and a description of the data you
              wish to access.
            </P>
            <P>
              We will respond within one calendar month. Where requests are complex or numerous,
              we may extend this by a further two months, and will notify you accordingly.
            </P>

            <H3 id="priv-ico">1.8 Right to Complain to the ICO</H3>
            <P>
              If you believe we have not handled your personal data in accordance with UK GDPR,
              you have the right to lodge a complaint with the Information Commissioner&apos;s Office
              (ICO), the UK supervisory authority for data protection:
            </P>
            <UL>
              <li>Website: <span className="text-neutral-400">ico.org.uk</span></li>
              <li>Telephone: 0303 123 1113</li>
              <li>Address: Information Commissioner&apos;s Office, Wycliffe House, Water Lane,
              Wilmslow, Cheshire, SK9 5AF</li>
            </UL>
            <P>
              We would, however, appreciate the opportunity to address your concerns before
              you approach the ICO. Please contact us first at{" "}
              <strong>privacy@soncar.co.uk</strong>.
            </P>

            <H3 id="priv-cookies">1.9 Cookies</H3>
            <P>
              We use cookies and similar technologies. For full details, see our{" "}
              <a href="#cookies" className="text-amber-400 hover:underline">Cookie Policy</a>.
            </P>

            <H3 id="priv-changes">1.10 Changes to This Policy</H3>
            <P>
              We may update this Privacy Policy from time to time. We will notify you of
              material changes by email or by displaying a prominent notice on our website.
              Continued use of our services after the effective date of any update constitutes
              acceptance of the revised policy.
            </P>
          </Section>

          {/* ──────────────────────────────────────────────────────
              2. TERMS & CONDITIONS
          ─────────────────────────────────────────────────────── */}
          <Section id="terms" title="Terms & Conditions">
            <Highlight>
              ⚠️ These Terms &amp; Conditions are intended as a legally informed foundation based
              on UK law. They should be reviewed by a qualified UK solicitor before you rely on
              them fully.
            </Highlight>

            <TableOfContents items={[
              { href: "#terms-accept",    label: "Acceptance of terms" },
              { href: "#terms-company",   label: "Company information" },
              { href: "#terms-products",  label: "Products and pricing" },
              { href: "#terms-orders",    label: "Order process and contract formation" },
              { href: "#terms-payment",   label: "Payment" },
              { href: "#terms-delivery",  label: "Delivery" },
              { href: "#terms-cancel",    label: "Cancellation rights" },
              { href: "#terms-returns",   label: "Returns and refunds" },
              { href: "#terms-faulty",    label: "Faulty goods" },
              { href: "#terms-liability", label: "Limitation of liability" },
              { href: "#terms-ip",        label: "Intellectual property" },
              { href: "#terms-accounts",  label: "User accounts" },
              { href: "#terms-community", label: "Community section" },
              { href: "#terms-mod",       label: "Moderation" },
              { href: "#terms-loyalty",   label: "Loyalty scheme" },
              { href: "#terms-law",       label: "Governing law" },
            ]} />

            <H3 id="terms-accept">2.1 Acceptance of Terms</H3>
            <P>
              By accessing or using the SONCAR website (soncar.co.uk) or placing an order, you
              agree to be bound by these Terms &amp; Conditions. If you do not agree, please do not
              use our website or services.
            </P>
            <P>
              These terms do not affect your statutory rights as a consumer under UK law,
              including rights under the Consumer Rights Act 2015 and Consumer Contracts
              Regulations 2013.
            </P>

            <H3 id="terms-company">2.2 Company Information</H3>
            <P>
              This website is operated by <strong>SONCAR Limited</strong>, a company registered
              in England and Wales. Our contact email is <strong>hello@soncar.co.uk</strong>.
              Full registered details are available on request.
            </P>

            <H3 id="terms-products">2.3 Product Descriptions and Pricing</H3>
            <P>
              We make every effort to ensure that product descriptions and prices on our website
              are accurate. However, errors may occasionally occur. If we discover a pricing
              error after you have placed an order, we will contact you and give you the option
              to proceed at the correct price or cancel your order for a full refund.
            </P>
            <P>
              All prices are shown in pounds sterling (£) and include VAT where applicable. We
              reserve the right to change prices at any time without prior notice, but changes
              will not affect orders already placed and confirmed.
            </P>
            <P>
              Product images are for illustration only. While we aim to represent products
              accurately, colours and packaging may vary slightly from what is shown.
            </P>

            <H3 id="terms-orders">2.4 Order Process and Contract Formation</H3>
            <P>
              In accordance with the Consumer Contracts Regulations 2013, our order process
              works as follows:
            </P>
            <OL>
              <li>You add products to your cart and proceed to checkout.</li>
              <li>You review your order and submit payment via our payment provider.</li>
              <li>
                We send an <strong>order acknowledgement</strong> email. This is confirmation
                that we have received your order but does not constitute acceptance.
              </li>
              <li>
                The contract between us is formed when we send a{" "}
                <strong>dispatch confirmation</strong> email confirming that your order has
                been dispatched.
              </li>
            </OL>
            <P>
              We reserve the right to refuse or cancel any order at our discretion, for example
              due to product unavailability, suspected fraud, or a pricing error. If we cancel
              an order for which you have already paid, we will issue a full refund promptly.
            </P>

            <H3 id="terms-payment">2.5 Payment Terms</H3>
            <P>
              Payment is taken at the time of order via Revolut Pay. All transactions are
              processed securely by Revolut Ltd. We do not store your card or payment details.
            </P>
            <P>
              By placing an order you confirm that you are authorised to use the payment method
              provided. If payment is declined, your order will not be processed.
            </P>

            <H3 id="terms-delivery">2.6 Delivery</H3>
            <P>
              Full delivery terms are set out in our{" "}
              <a href="#shipping" className="text-amber-400 hover:underline">
                Shipping &amp; Returns Policy
              </a>
              . We aim to dispatch orders within 1–2 working days of order confirmation. Delivery
              times are estimates and not guaranteed. Risk in the goods passes to you on delivery.
            </P>

            <H3 id="terms-cancel">2.7 Cancellation Rights (Consumer Contracts Regulations 2013)</H3>
            <P>
              If you are a consumer contracting with us at a distance (online), you have the
              right to cancel your order within <strong>14 calendar days</strong> of receiving
              the goods (&quot;cooling-off period&quot;) without giving any reason.
            </P>
            <P>To exercise your right to cancel, you must inform us clearly before the
            14-day period expires by contacting <strong>hello@soncar.co.uk</strong> with your
            order number and a clear statement of your decision to cancel.</P>
            <P>
              You must return the goods to us promptly and in any event no later than 14 days
              after notifying us of cancellation. You are responsible for the cost of return
              postage unless the goods are faulty or we have agreed otherwise.
            </P>
            <P>
              We will refund the price of the goods, including the standard delivery charge
              (not any premium delivery costs), within 14 days of receiving the returned goods
              or evidence of return, whichever is earlier. Refunds will be made using the same
              payment method used for the original transaction.
            </P>
            <P>
              The right to cancel does not apply to perishable goods, goods that have been
              opened or used, or goods personalised or made to your specification.
            </P>

            <H3 id="terms-returns">2.8 Returns and Refunds (Consumer Rights Act 2015)</H3>
            <P>
              Our returns policy is detailed in our{" "}
              <a href="#shipping" className="text-amber-400 hover:underline">
                Shipping &amp; Returns Policy
              </a>
              . In addition to your statutory cancellation rights above, you may return
              unopened items within 30 days for a full refund as a goodwill gesture beyond your
              statutory entitlement.
            </P>

            <H3 id="terms-faulty">2.9 Faulty Goods (Consumer Rights Act 2015)</H3>
            <P>
              Under the Consumer Rights Act 2015, goods must be of satisfactory quality, fit
              for purpose, and as described. If goods you receive are faulty, damaged, or
              misdescribed, you have the following rights:
            </P>
            <UL>
              <li>
                <strong>Within 30 days of delivery:</strong> you may reject the goods and
                receive a full refund.
              </li>
              <li>
                <strong>Within 6 months of delivery:</strong> you may request a repair or
                replacement. If repair or replacement is not possible or fails, you are entitled
                to a partial or full refund.
              </li>
              <li>
                <strong>After 6 months:</strong> you retain rights but must demonstrate that the
                fault existed at the time of delivery.
              </li>
            </UL>
            <P>
              To report a faulty item, contact us at <strong>hello@soncar.co.uk</strong> with
              your order number and a description or photograph of the fault.
            </P>

            <H3 id="terms-liability">2.10 Limitation of Liability</H3>
            <P>
              Nothing in these terms limits or excludes our liability for death or personal
              injury caused by our negligence, fraud or fraudulent misrepresentation, or any
              other liability that cannot be limited or excluded by law.
            </P>
            <P>
              Subject to the above, our total liability to you arising under or in connection
              with these terms, whether in contract, tort (including negligence), breach of
              statutory duty, or otherwise, shall not exceed the total price paid by you for
              the goods in the relevant order.
            </P>
            <P>
              We are not liable for indirect losses including loss of income, profit, business,
              anticipated savings, or goodwill arising from your use of our website or services.
            </P>
            <P>
              We do not guarantee that our website will be uninterrupted or error-free. We
              reserve the right to suspend or withdraw access to the website at any time.
            </P>

            <H3 id="terms-ip">2.11 Intellectual Property</H3>
            <P>
              All intellectual property rights in our website, branding, product images, and
              content (excluding user-generated content) are owned by or licensed to SONCAR
              Limited. You may not reproduce, distribute, or use our content without our prior
              written consent.
            </P>
            <P>
              For user-generated content (posts, comments), see our{" "}
              <a href="#community" className="text-amber-400 hover:underline">
                Community Guidelines
              </a>
              .
            </P>

            <H3 id="terms-accounts">2.12 User Accounts and Membership</H3>
            <P>
              To access certain features (placing orders, earning loyalty points, posting in the
              community), you must create an account. You are responsible for maintaining the
              confidentiality of your login credentials and for all activity that occurs under
              your account.
            </P>
            <P>
              You must provide accurate and complete information when registering. You must
              notify us immediately of any unauthorised use of your account.
            </P>
            <P>
              We reserve the right to suspend or terminate accounts that are used in breach of
              these terms, including any accounts engaged in abusive, fraudulent, or unlawful
              activity.
            </P>

            <H3 id="terms-community">2.13 Community Section</H3>
            <P>
              Access to our community section is subject to our{" "}
              <a href="#community" className="text-amber-400 hover:underline">
                Community Guidelines
              </a>
              , which form part of these Terms &amp; Conditions. By using the community section
              you agree to those guidelines.
            </P>

            <H3 id="terms-mod">2.14 Moderation</H3>
            <P>
              SONCAR Limited reserves the right to remove any content from the community
              section that violates our Community Guidelines or applicable law, and to suspend
              or ban members who breach our guidelines. Moderation decisions are at our sole
              discretion. See our{" "}
              <a href="#community" className="text-amber-400 hover:underline">
                Community Guidelines
              </a>{" "}
              for details.
            </P>

            <H3 id="terms-loyalty">2.15 Loyalty Scheme</H3>
            <P>
              Participation in our loyalty scheme is subject to our{" "}
              <a href="#loyalty" className="text-amber-400 hover:underline">
                Loyalty Scheme Terms
              </a>
              , which form part of these Terms &amp; Conditions.
            </P>

            <H3 id="terms-law">2.16 Governing Law and Jurisdiction</H3>
            <P>
              These terms are governed by the law of England and Wales. Any disputes arising
              from or relating to these terms shall be subject to the exclusive jurisdiction of
              the courts of England and Wales, without affecting your rights as a consumer to
              bring claims in the courts of the country where you live.
            </P>
          </Section>

          {/* ──────────────────────────────────────────────────────
              3. SHIPPING & RETURNS
          ─────────────────────────────────────────────────────── */}
          <Section id="shipping" title="Shipping & Returns Policy">
            <TableOfContents items={[
              { href: "#ship-dispatch",     label: "Dispatch timeframes" },
              { href: "#ship-options",      label: "UK delivery options and costs" },
              { href: "#ship-international",label: "International shipping" },
              { href: "#ship-returns",      label: "Returns process" },
              { href: "#ship-refunds",      label: "Refund timeframes" },
              { href: "#ship-faulty",       label: "Faulty or damaged goods" },
              { href: "#ship-how",          label: "How to initiate a return" },
            ]} />

            <H3 id="ship-dispatch">3.1 Dispatch Timeframes</H3>
            <UL>
              <li>
                <strong>Standard dispatch:</strong> orders are processed and dispatched within
                1–2 working days of order confirmation (Monday to Friday, excluding UK public
                holidays).
              </li>
              <li>
                <strong>Premium/same-day dispatch:</strong> orders placed before 12:00 noon on
                a working day are dispatched the same day where this service is selected and
                available.
              </li>
            </UL>
            <P>
              You will receive a dispatch confirmation email once your order has been collected
              by our delivery partner.
            </P>

            <H3 id="ship-options">3.2 UK Delivery Options and Costs</H3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400">
                    <th className="text-left py-2 pr-4 font-medium">Service</th>
                    <th className="text-left py-2 pr-4 font-medium">Estimated delivery</th>
                    <th className="text-left py-2 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-neutral-300">
                  <tr>
                    <td className="py-2 pr-4">Standard UK delivery</td>
                    <td className="py-2 pr-4">2–4 working days</td>
                    <td className="py-2">£3.99</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Express UK delivery</td>
                    <td className="py-2 pr-4">Next working day</td>
                    <td className="py-2">£6.99</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">
                      <strong>Free standard delivery</strong>
                    </td>
                    <td className="py-2 pr-4">2–4 working days</td>
                    <td className="py-2">
                      <strong>Free</strong> on orders over £60
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <P>
              Delivery times are estimates and are not guaranteed. We are not responsible for
              delays caused by our delivery partners, adverse weather, or events outside our
              control. If your order is significantly delayed, please contact us at{" "}
              <strong>hello@soncar.co.uk</strong>.
            </P>

            <H3 id="ship-international">3.3 International Shipping</H3>
            <P>
              We currently ship to the United Kingdom only. We do not currently offer
              international delivery. If you are based outside the UK and would like to place an
              order, please contact us at <strong>hello@soncar.co.uk</strong> to discuss
              options.
            </P>

            <H3 id="ship-returns">3.4 Returns Process</H3>
            <P>
              We want you to be completely satisfied with your purchase. We accept returns on
              the following basis:
            </P>
            <UL>
              <li>
                <strong>Change of mind:</strong> unopened, unused items in their original
                packaging may be returned within <strong>30 days</strong> of the delivery date.
                You are responsible for the cost of return postage.
              </li>
              <li>
                <strong>Statutory cancellation right:</strong> within the first 14 days after
                delivery, you also have a statutory right to cancel under the Consumer Contracts
                Regulations 2013 — see Section 2.7 of our Terms &amp; Conditions.
              </li>
              <li>
                <strong>Opened or used items:</strong> we cannot accept returns on items that
                have been opened, used, or are not in a resaleable condition, unless they are
                faulty.
              </li>
              <li>
                <strong>Perishable goods:</strong> we cannot accept returns on perishable items
                (such as food or nutritional products) once opened.
              </li>
            </UL>

            <H3 id="ship-refunds">3.5 Refund Timeframes</H3>
            <P>
              In accordance with the Consumer Rights Act 2015 and Consumer Contracts Regulations
              2013:
            </P>
            <UL>
              <li>
                Refunds for change-of-mind returns will be processed within{" "}
                <strong>14 days</strong> of us receiving the returned goods.
              </li>
              <li>
                Refunds for cancelled orders (within the 14-day cooling-off period) will be
                processed within <strong>14 days</strong> of receiving your cancellation notice,
                provided we have received the goods back or evidence of return.
              </li>
              <li>
                Refunds for faulty goods will be processed promptly, typically within{" "}
                <strong>5–10 working days</strong> of our receiving and inspecting the return.
              </li>
            </UL>
            <P>
              All refunds will be made to the original payment method. We do not issue refunds
              via an alternative method without your agreement.
            </P>

            <H3 id="ship-faulty">3.6 Faulty or Damaged Goods</H3>
            <P>
              If you receive goods that are damaged in transit or are faulty, you must notify
              us within a reasonable time and in any event within 30 days of delivery. For goods
              that develop a fault after delivery, your rights are set out in Section 2.9 of our
              Terms &amp; Conditions.
            </P>
            <P>
              For goods that are damaged in transit, please retain all original packaging and
              take photographs before contacting us. We may ask you to submit photographs before
              authorising a return or replacement.
            </P>
            <P>
              We will cover all return postage costs for faulty or damaged goods. We will not
              ask you to return goods that are clearly faulty if the cost of return would be
              disproportionate.
            </P>

            <H3 id="ship-how">3.7 How to Initiate a Return</H3>
            <OL>
              <li>
                Email <strong>hello@soncar.co.uk</strong> with the subject &quot;Return Request&quot;,
                including your order number, the item(s) you wish to return, and the reason.
              </li>
              <li>
                We will respond within 2 working days with a returns authorisation and
                instructions for where to send the goods.
              </li>
              <li>
                Pack the item(s) securely in the original packaging where possible. Include a
                note with your order number inside the parcel.
              </li>
              <li>
                For change-of-mind returns, send the parcel via a tracked service and retain
                proof of postage. We cannot be responsible for returns lost in transit.
              </li>
              <li>
                Once we receive and inspect the return, we will process your refund or
                replacement within the timeframes above.
              </li>
            </OL>
          </Section>

          {/* ──────────────────────────────────────────────────────
              4. COOKIE POLICY
          ─────────────────────────────────────────────────────── */}
          <Section id="cookies" title="Cookie Policy">
            <TableOfContents items={[
              { href: "#cook-what",    label: "What are cookies?" },
              { href: "#cook-types",   label: "Categories of cookies we use" },
              { href: "#cook-specific",label: "Specific cookies" },
              { href: "#cook-manage",  label: "Managing and opting out" },
              { href: "#cook-legal",   label: "Legal basis (PECR and UK GDPR)" },
            ]} />

            <H3 id="cook-what">4.1 What Are Cookies?</H3>
            <P>
              Cookies are small text files that are placed on your device (computer, tablet, or
              smartphone) when you visit a website. They allow the website to recognise your
              device and store certain information about your preferences or actions.
            </P>
            <P>
              Similar technologies include web beacons, pixels, and local storage. When we refer
              to &quot;cookies&quot; in this policy, we include these similar technologies unless stated
              otherwise.
            </P>

            <H3 id="cook-types">4.2 Categories of Cookies We Use</H3>

            <p className="font-medium text-neutral-100">Essential cookies</p>
            <P>
              These cookies are strictly necessary for our website to function and cannot be
              switched off without breaking the site. They include:
            </P>
            <UL>
              <li>Session authentication cookies (to keep you logged in to your account).</li>
              <li>Shopping cart cookies (to maintain your cart contents).</li>
              <li>Security cookies (to protect against cross-site request forgery).</li>
            </UL>
            <P>
              Essential cookies do not require your consent under PECR as they are necessary
              for a service you have explicitly requested.
            </P>

            <p className="font-medium text-neutral-100 mt-4">Analytics cookies</p>
            <P>
              These cookies help us understand how visitors interact with our website. We use
              this information to improve our website and services. Analytics cookies are only
              set with your consent.
            </P>

            <p className="font-medium text-neutral-100 mt-4">Marketing cookies</p>
            <P>
              Marketing cookies track your browsing activity to show you relevant advertising
              on other websites and platforms. They are only set with your consent. You can
              withdraw consent at any time.
            </P>

            <H3 id="cook-specific">4.3 Specific Cookies</H3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400">
                    <th className="text-left py-2 pr-3 font-medium">Cookie name</th>
                    <th className="text-left py-2 pr-3 font-medium">Provider</th>
                    <th className="text-left py-2 pr-3 font-medium">Purpose</th>
                    <th className="text-left py-2 font-medium">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-neutral-300">
                  {[
                    ["sb-*-auth-token", "Supabase", "Maintains your login session", "Essential"],
                    ["soncar_cart_v1", "SONCAR", "Stores your shopping cart contents in your browser (localStorage)", "Essential"],
                    ["_vercel_*", "Vercel", "Load balancing and deployment routing", "Essential"],
                    ["_ga, _gid", "Google Analytics (if enabled)", "Tracks site usage and visitor statistics anonymously", "Analytics"],
                    ["_fbp, _fbc", "Meta (if enabled)", "Marketing attribution and personalised advertising", "Marketing"],
                  ].map(([name, provider, purpose, category]) => (
                    <tr key={name}>
                      <td className="py-2 pr-3 font-mono text-neutral-200">{name}</td>
                      <td className="py-2 pr-3">{provider}</td>
                      <td className="py-2 pr-3">{purpose}</td>
                      <td className="py-2">{category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <P>
              This list may not be exhaustive. Where third-party services (such as our payment
              provider) set their own cookies during checkout, those cookies are governed by
              those providers&apos; own cookie policies.
            </P>

            <H3 id="cook-manage">4.4 Managing and Opting Out of Cookies</H3>
            <P>
              You can manage your cookie preferences in the following ways:
            </P>
            <UL>
              <li>
                <strong>Browser settings:</strong> most browsers allow you to block or delete
                cookies via their settings menu. Note that blocking essential cookies will
                prevent core features (such as login and checkout) from working.
              </li>
              <li>
                <strong>Google Analytics opt-out:</strong> you can install the Google Analytics
                Opt-out Browser Add-on at tools.google.com/dlpage/gaoptout.
              </li>
              <li>
                <strong>Interest-based advertising:</strong> you can opt out of interest-based
                advertising via Your Online Choices (youronlinechoices.eu) or the Network
                Advertising Initiative (optout.networkadvertising.org).
              </li>
            </UL>
            <P>
              Please note that opting out of analytics or marketing cookies does not prevent
              you from using our website — it only means we (or our partners) will not collect
              data for those purposes.
            </P>

            <H3 id="cook-legal">4.5 Legal Basis — PECR and UK GDPR</H3>
            <P>
              Our use of cookies is governed by the Privacy and Electronic Communications
              Regulations 2003 (PECR) as well as UK GDPR. Under PECR:
            </P>
            <UL>
              <li>
                We may set <strong>essential cookies</strong> without consent because they are
                strictly necessary for a service you have requested.
              </li>
              <li>
                For <strong>analytics and marketing cookies</strong>, we require your freely
                given, specific, informed, and unambiguous consent before setting them.
              </li>
            </UL>
            <P>
              Where we process personal data collected via cookies (for example, IP addresses
              via analytics), the legal basis under UK GDPR is consent, or legitimate interests
              where consent is not required.
            </P>
            <P>
              You can withdraw your consent to non-essential cookies at any time by adjusting
              your browser settings or contacting us at <strong>privacy@soncar.co.uk</strong>.
            </P>
          </Section>

          {/* ──────────────────────────────────────────────────────
              5. COMMUNITY GUIDELINES
          ─────────────────────────────────────────────────────── */}
          <Section id="community" title="Community Guidelines">
            <TableOfContents items={[
              { href: "#comm-purpose",   label: "Purpose of the community" },
              { href: "#comm-age",       label: "Age requirements" },
              { href: "#comm-acceptable",label: "Acceptable use" },
              { href: "#comm-prohibited",label: "Prohibited content" },
              { href: "#comm-responsibility", label: "Member responsibilities" },
              { href: "#comm-moderation",label: "Moderation policy" },
              { href: "#comm-appeals",   label: "Appeals process" },
              { href: "#comm-removal",   label: "Content removal" },
              { href: "#comm-ip",        label: "Intellectual property" },
            ]} />

            <H3 id="comm-purpose">5.1 Purpose of the Community</H3>
            <P>
              The SONCAR community section is a space for members to share training tips,
              recipes, progress updates, and motivation. Our goal is to maintain a supportive,
              inclusive, and respectful environment for all members.
            </P>
            <P>
              These guidelines exist to set expectations and protect our members. Participation
              in the community constitutes acceptance of these guidelines.
            </P>

            <H3 id="comm-age">5.2 Age Requirements</H3>
            <P>
              The SONCAR community is intended for users aged <strong>18 and over</strong>.
              Users aged 16–17 may create an account and access the community with verifiable
              parental or guardian consent. We do not knowingly allow users under the age of 16
              to participate in the community section. If you become aware of a user under 16,
              please report it to <strong>hello@soncar.co.uk</strong>.
            </P>

            <H3 id="comm-acceptable">5.3 Acceptable Use</H3>
            <P>The community section is a place to:</P>
            <UL>
              <li>Share genuine training tips, workout plans, and fitness experiences.</li>
              <li>Post recipes, nutritional advice, and food-related content.</li>
              <li>Share progress updates, achievements, and motivation.</li>
              <li>Engage constructively and supportively with other members.</li>
              <li>Ask questions and seek advice from the community.</li>
            </UL>

            <H3 id="comm-prohibited">5.4 Prohibited Content</H3>
            <P>The following content is strictly prohibited:</P>
            <UL>
              <li>
                <strong>Hate speech and discrimination:</strong> content that promotes, incites,
                or glorifies hatred, discrimination, or violence based on race, ethnicity,
                religion, gender, gender identity, sexual orientation, disability, or any other
                protected characteristic.
              </li>
              <li>
                <strong>Harassment and bullying:</strong> targeted abuse, threats, or
                intimidation of any individual or group.
              </li>
              <li>
                <strong>Spam and unsolicited promotion:</strong> repetitive posts, unsolicited
                commercial messages, pyramid schemes, or content designed to drive traffic to
                external websites without prior approval.
              </li>
              <li>
                <strong>Illegal content:</strong> content that violates UK law, including but
                not limited to content that infringes copyright, defames individuals, constitutes
                fraud, or distributes or promotes illegal substances.
              </li>
              <li>
                <strong>Misinformation:</strong> deliberately false or misleading health,
                medical, or safety claims.
              </li>
              <li>
                <strong>Explicit or adult content:</strong> sexually explicit material, graphic
                violence, or content not suitable for a general audience.
              </li>
              <li>
                <strong>Personal data of others:</strong> sharing another person's private
                information without their consent (&quot;doxxing&quot;).
              </li>
              <li>
                <strong>Impersonation:</strong> impersonating SONCAR staff, other members, or
                any public figure.
              </li>
            </UL>

            <H3 id="comm-responsibility">5.5 Member Responsibilities</H3>
            <P>As a community member, you are solely responsible for:</P>
            <UL>
              <li>All content you post, including its accuracy and legality.</li>
              <li>Ensuring you have the right to share any images, text, or other material you post.</li>
              <li>Not infringing third-party intellectual property rights.</li>
              <li>Any consequences arising from your posts, including legal liability to third parties.</li>
            </UL>
            <P>
              SONCAR Limited does not pre-screen community content and is not responsible for
              content posted by members. However, we reserve the right to review, moderate, and
              remove content at our sole discretion.
            </P>

            <H3 id="comm-moderation">5.6 Moderation Policy</H3>
            <P>
              Our moderation team (members with <strong>admin</strong> or{" "}
              <strong>super admin</strong> roles) has the authority to:
            </P>
            <UL>
              <li>Remove posts or comments that violate these guidelines.</li>
              <li>Issue formal warnings to members.</li>
              <li>Temporarily suspend or permanently ban members from the community.</li>
              <li>Flag content for escalated review.</li>
            </UL>
            <P>
              Moderation actions are taken at the discretion of our moderation team. We aim to
              apply these guidelines consistently and fairly. Moderators are bound by our
              internal code of conduct.
            </P>
            <P>
              SONCAR Limited reserves the right to take moderation action without prior notice
              where content poses a risk of harm to members or third parties, or where immediate
              action is required to comply with the law.
            </P>

            <H3 id="comm-appeals">5.7 Appeals Process</H3>
            <P>
              If you believe a moderation decision (content removal, warning, or ban) was made
              in error, you may appeal by emailing{" "}
              <strong>hello@soncar.co.uk</strong> within{" "}
              <strong>14 days</strong> of the decision with:
            </P>
            <UL>
              <li>Your username and the date of the decision.</li>
              <li>A description of the content that was removed or the action taken.</li>
              <li>Your reasons for believing the decision was incorrect.</li>
            </UL>
            <P>
              We will review your appeal and respond within 10 working days. Appeals are
              reviewed by a member of our team who was not involved in the original decision
              where practicable.
            </P>
            <P>
              Our decision on appeal is final, but does not affect any rights you may have under
              applicable law.
            </P>

            <H3 id="comm-removal">5.8 SONCAR&apos;s Right to Remove Content</H3>
            <P>
              SONCAR Limited reserves the right to remove any content from the community
              section at any time and without prior notice, at our sole discretion. This
              includes content that we consider — in good faith — to violate these guidelines,
              applicable law, or that is otherwise harmful or inappropriate, even if not
              explicitly covered by these guidelines.
            </P>

            <H3 id="comm-ip">5.9 Intellectual Property</H3>
            <P>
              You retain ownership of all content you post to the SONCAR community section. By
              posting content, you grant SONCAR Limited a <strong>non-exclusive, royalty-free,
              worldwide licence</strong> to display, reproduce, and distribute your content
              within the SONCAR platform (including any future features, apps, or services) for
              as long as the content remains on the platform.
            </P>
            <P>
              This licence does not give us the right to sell your content independently or use
              it for advertising without your separate consent. You may delete your content at
              any time, which terminates this licence in respect of the deleted content.
            </P>
            <P>
              By posting content, you confirm that you own or have the necessary rights and
              permissions to grant this licence, and that your content does not infringe any
              third-party intellectual property rights.
            </P>
          </Section>

          {/* ──────────────────────────────────────────────────────
              6. LOYALTY SCHEME TERMS
          ─────────────────────────────────────────────────────── */}
          <Section id="loyalty" title="Loyalty Scheme Terms">
            <TableOfContents items={[
              { href: "#loy-overview",   label: "Scheme overview" },
              { href: "#loy-earning",    label: "Earning points" },
              { href: "#loy-tiers",      label: "Tier structure" },
              { href: "#loy-redeeming",  label: "Redeeming points" },
              { href: "#loy-expiry",     label: "Points expiry" },
              { href: "#loy-value",      label: "Points have no cash value" },
              { href: "#loy-changes",    label: "Changes and termination" },
              { href: "#loy-closure",    label: "Account closure or ban" },
            ]} />

            <H3 id="loy-overview">6.1 Scheme Overview</H3>
            <P>
              The SONCAR Loyalty Scheme rewards members for purchases and community engagement.
              Points are credited to your account automatically and count towards your
              membership tier. Participation is free and automatic for all registered account
              holders.
            </P>

            <H3 id="loy-earning">6.2 How Points Are Earned</H3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400">
                    <th className="text-left py-2 pr-4 font-medium">Activity</th>
                    <th className="text-left py-2 font-medium">Points awarded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-neutral-300">
                  {[
                    ["Account sign-up (one-time welcome bonus)", "100 points"],
                    ["Purchase (per £1 spent, calculated on the net order value)", "5 points per £1"],
                    ["Community post created", "5 points"],
                    ["Comment posted", "1 point"],
                  ].map(([activity, points]) => (
                    <tr key={activity}>
                      <td className="py-2 pr-4">{activity}</td>
                      <td className="py-2 font-medium text-amber-400">{points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <P>
              Points for purchases are awarded when your order is confirmed. Points may be
              reversed if an order is subsequently refunded or cancelled.
            </P>
            <P>
              SONCAR reserves the right to award bonus points for specific promotions, events,
              or activities at its sole discretion. Bonus point events will be communicated via
              our website or email.
            </P>

            <H3 id="loy-tiers">6.3 Tier Structure</H3>
            <P>
              Your membership tier is determined by your <strong>total cumulative lifetime
              points</strong>. Tiers are based on points accumulated over your entire membership
              and <strong>cannot decrease</strong> when points are redeemed — only new earning
              activity counts towards tier progression.
            </P>
            <P>
              There are thirteen membership tiers across five bands. Each band has three
              sub-tiers (1, 2, 3), except Diamond which is a single tier reserved for SONCAR
              team members:
            </P>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400">
                    <th className="text-left py-2 pr-4 font-medium">Tier</th>
                    <th className="text-left py-2 pr-4 font-medium">Cumulative points required</th>
                    <th className="text-left py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-neutral-300">
                  {[
                    ["Bronze 1",   "0 points",       "Entry tier for all new members"],
                    ["Bronze 2",   "250 points",     ""],
                    ["Bronze 3",   "500 points",     ""],
                    ["Silver 1",   "750 points",     ""],
                    ["Silver 2",   "1,050 points",   ""],
                    ["Silver 3",   "1,350 points",   ""],
                    ["Gold 1",     "1,650 points",   ""],
                    ["Gold 2",     "2,000 points",   ""],
                    ["Gold 3",     "2,350 points",   ""],
                    ["Platinum 1", "2,700 points",   ""],
                    ["Platinum 2", "3,100 points",   ""],
                    ["Platinum 3", "3,500 points",   ""],
                    ["Diamond",    "4,000 points",   "Also granted automatically to super admin accounts"],
                  ].map(([tier, threshold, note]) => (
                    <tr key={tier}>
                      <td className="py-2 pr-4 font-medium">{tier}</td>
                      <td className="py-2 pr-4">{threshold}</td>
                      <td className="py-2 text-neutral-400">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <P>
              Tier benefits (such as exclusive content, early access, or promotional offers)
              are set by SONCAR from time to time and communicated to members via our website.
              We reserve the right to change tier benefits with reasonable notice.
            </P>

            <H3 id="loy-redeeming">6.4 Redeeming Points</H3>
            <P>
              Details of how to redeem your loyalty points will be communicated to members
              when redemption features are available. Redemption options, minimum thresholds,
              and redemption values are set by SONCAR and may change from time to time.
            </P>
            <P>
              Points redemption is subject to availability and cannot be applied
              retrospectively to completed orders.
            </P>

            <H3 id="loy-expiry">6.5 Points Expiry</H3>
            <P>
              Loyalty points do not expire while your account remains active and in good
              standing. Points may be forfeited if your account has been inactive (no login,
              purchase, or community activity) for a continuous period of <strong>24
              months</strong>. We will notify you by email before any points are forfeited due
              to inactivity.
            </P>

            <H3 id="loy-value">6.6 Points Have No Cash Value</H3>
            <P>
              Loyalty points have no monetary value and cannot be exchanged for cash, transferred
              to another person, sold, or traded. Points are not a financial instrument and do not
              constitute property.
            </P>

            <H3 id="loy-changes">6.7 Changes and Termination of the Scheme</H3>
            <P>
              SONCAR Limited reserves the right to modify, suspend, or terminate the loyalty
              scheme at any time, subject to providing reasonable advance notice to members
              (typically no less than 30 days, except where required by law or exceptional
              circumstances).
            </P>
            <P>
              Changes may include (but are not limited to) amendments to the points earning
              rates, tier thresholds, tier benefits, redemption terms, or the discontinuation
              of the scheme entirely. We will communicate material changes by email and/or a
              notice on our website.
            </P>
            <P>
              Changes do not affect points already accrued in your account as at the date the
              change takes effect.
            </P>

            <H3 id="loy-closure">6.8 Account Closure or Ban</H3>
            <UL>
              <li>
                <strong>Voluntary account closure:</strong> if you close your account, any
                accrued loyalty points will be permanently forfeited with no entitlement to
                compensation.
              </li>
              <li>
                <strong>Account suspension:</strong> during a suspension, points continue to
                accrue from active orders but cannot be redeemed. Suspended accounts may have
                accrued points reinstated on lifting of the suspension, at SONCAR&apos;s discretion.
              </li>
              <li>
                <strong>Account ban for breach of terms:</strong> if your account is permanently
                banned for a serious or repeated breach of our Terms &amp; Conditions or Community
                Guidelines, all accrued loyalty points will be forfeited immediately. You will
                not be entitled to compensation for forfeited points.
              </li>
            </UL>
            <P>
              These loyalty scheme terms are governed by the law of England and Wales and form
              part of our Terms &amp; Conditions.
            </P>
          </Section>

        </div>

        {/* Footer note */}
        <div className="mt-12 rounded-xl border border-white/10 bg-white/5 px-6 py-5 text-xs text-neutral-400 leading-relaxed">
          <p className="font-medium text-neutral-300 mb-1">Legal disclaimer</p>
          <p>
            These policies are intended as a solid legally informed foundation based on UK law,
            including UK GDPR, the Consumer Rights Act 2015, the Consumer Contracts Regulations
            2013, and the Privacy and Electronic Communications Regulations (PECR). They should
            be reviewed by a qualified UK solicitor before you rely on them fully. Nothing on
            this page constitutes legal advice.
          </p>
          <p className="mt-3">
            If you have a question about any of our policies, please contact us at{" "}
            <strong className="text-neutral-300">hello@soncar.co.uk</strong>. Last updated:{" "}
            {LAST_UPDATED}.
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-neutral-400 hover:text-white">
            ← Back to SONCAR
          </Link>
        </div>
      </div>
    </main>
  );
}
