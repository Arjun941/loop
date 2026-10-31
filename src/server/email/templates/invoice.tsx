/**
 * Billing emails: a new invoice, and reminders for overdue invoices and upcoming renewals.
 * Reminder tone gets firmer with each stage, but stays polite.
 */
import { Button, Column, Hr, Row, Section, Text } from "@react-email/components";
import { EmailLayout, styles } from "./layout";

const cell = { fontSize: "14px", color: "#3a3a3c", padding: "6px 0" };
const right = { ...cell, textAlign: "right" as const };
const strong = { fontWeight: 600, color: "#1d1d1f", fontSize: "16px" };

export type InvoiceEmailProps = {
  customerName: string;
  number: string;
  period: string;
  lines: { description: string; qty: number; amount: string }[];
  subtotal: string;
  discount: string | null;
  tax: string;
  total: string;
  dueDate: string;
  portalUrl: string;
};

export function InvoiceEmail(p: InvoiceEmailProps) {
  return (
    <EmailLayout preview={`Invoice ${p.number} · ${p.total} due ${p.dueDate}`}>
      <Text style={styles.heading}>Invoice {p.number}</Text>
      <Text style={styles.text}>
        Hi {p.customerName.split(" ")[0]}, here&apos;s your invoice for {p.period}. It&apos;s due on <strong>{p.dueDate}</strong>.
      </Text>
      <Section style={{ margin: "8px 0 4px" }}>
        {p.lines.map((l, i) => (
          <Row key={i}>
            <Column style={cell}>
              {l.qty > 1 ? `${l.qty} × ` : ""}
              {l.description}
            </Column>
            <Column style={right}>{l.amount}</Column>
          </Row>
        ))}
        <Hr style={{ borderColor: "#e5e5ea", margin: "10px 0" }} />
        <Row>
          <Column style={cell}>Subtotal</Column>
          <Column style={right}>{p.subtotal}</Column>
        </Row>
        {p.discount && (
          <Row>
            <Column style={cell}>Discount</Column>
            <Column style={{ ...right, color: "#1f9d55" }}>−{p.discount}</Column>
          </Row>
        )}
        <Row>
          <Column style={cell}>Tax</Column>
          <Column style={right}>{p.tax}</Column>
        </Row>
        <Row>
          <Column style={{ ...cell, ...strong }}>Amount due</Column>
          <Column style={{ ...right, ...strong }}>{p.total}</Column>
        </Row>
      </Section>
      <Button href={p.portalUrl} style={{ ...styles.button, marginTop: "16px" }}>
        View invoice
      </Button>
    </EmailLayout>
  );
}

export type OverdueStage = 1 | 2 | 3;

const OVERDUE_COPY: Record<OverdueStage, { heading: string; body: string }> = {
  1: { heading: "A friendly reminder", body: "looks like it slipped through. It was due on" },
  2: { heading: "Your invoice is overdue", body: "is now a week past due. It was due on" },
  3: { heading: "Action needed: overdue invoice", body: "is now two weeks past due. Please arrange payment, or reply if something's wrong. It was due on" },
};

export function OverdueReminderEmail({
  stage,
  customerName,
  number,
  balance,
  dueDate,
  portalUrl,
}: {
  stage: OverdueStage;
  customerName: string;
  number: string;
  balance: string;
  dueDate: string;
  portalUrl: string;
}) {
  const copy = OVERDUE_COPY[stage];
  return (
    <EmailLayout preview={`${number}: ${balance} outstanding`}>
      <Text style={styles.heading}>{copy.heading}</Text>
      <Text style={styles.text}>
        Hi {customerName.split(" ")[0]}, invoice <strong>{number}</strong> for <strong>{balance}</strong> {copy.body} {dueDate}.
      </Text>
      <Button href={portalUrl} style={styles.button}>
        View invoice
      </Button>
      <Text style={{ ...styles.muted, marginTop: "24px" }}>Already paid? Thank you, and please ignore this email.</Text>
    </EmailLayout>
  );
}

export function RenewalReminderEmail({
  customerName,
  number,
  planName,
  expiryDate,
  portalUrl,
}: {
  customerName: string;
  number: string;
  planName: string;
  expiryDate: string;
  portalUrl: string;
}) {
  return (
    <EmailLayout preview={`${planName} ends on ${expiryDate}`}>
      <Text style={styles.heading}>Your subscription ends soon</Text>
      <Text style={styles.text}>
        Hi {customerName.split(" ")[0]}, your <strong>{planName}</strong> subscription ({number}) ends on <strong>{expiryDate}</strong>. Renew to
        keep everything running without a gap.
      </Text>
      <Button href={portalUrl} style={styles.button}>
        Review renewal
      </Button>
    </EmailLayout>
  );
}
