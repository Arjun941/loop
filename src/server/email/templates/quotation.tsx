/**
 * The quotation a customer receives: what they're buying, what it costs each period, and until when the offer stands.
 */
import { Button, Column, Hr, Row, Section, Text } from "@react-email/components";
import { EmailLayout, styles } from "./layout";

export type QuotationEmailProps = {
  customerName: string;
  number: string;
  planName: string;
  period: string;
  lines: { description: string; qty: number; amount: string }[];
  subtotal: string;
  discount: string | null;
  tax: string;
  total: string;
  validUntil: string | null;
  paymentTermsDays: number;
  startDate: string;
  portalUrl: string;
};

const cell = { fontSize: "14px", color: "#3a3a3c", padding: "6px 0" };
const right = { ...cell, textAlign: "right" as const };

export function QuotationEmail(p: QuotationEmailProps) {
  return (
    <EmailLayout preview={`Your quotation ${p.number} · ${p.total} per ${p.period}`}>
      <Text style={styles.heading}>Your quotation</Text>
      <Text style={styles.text}>
        Hi {p.customerName.split(" ")[0]}, here&apos;s the offer for <strong>{p.planName}</strong>, starting {p.startDate}.
        {p.validUntil && <> It&apos;s valid until {p.validUntil}.</>}
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
          <Column style={{ ...cell, fontWeight: 600, color: "#1d1d1f", fontSize: "16px" }}>Total per {p.period}</Column>
          <Column style={{ ...right, fontWeight: 600, color: "#1d1d1f", fontSize: "16px" }}>{p.total}</Column>
        </Row>
      </Section>

      <Text style={{ ...styles.muted, margin: "12px 0 24px" }}>
        Reference {p.number} · Payment due {p.paymentTermsDays} days after each invoice.
      </Text>
      <Button href={p.portalUrl} style={styles.button}>
        Review in your portal
      </Button>
    </EmailLayout>
  );
}
