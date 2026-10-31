/**
 * Shared frame for every email: calm, centered, readable in any client.
 */
import { Body, Container, Head, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { emailCompany } from "./company";

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

export const styles = {
  heading: { fontSize: "22px", fontWeight: 600, letterSpacing: "-0.02em", color: "#1d1d1f", margin: "0 0 12px" },
  text: { fontSize: "15px", lineHeight: "24px", color: "#3a3a3c", margin: "0 0 16px" },
  muted: { fontSize: "13px", lineHeight: "20px", color: "#86868b", margin: "0" },
  button: {
    backgroundColor: "#0071e3",
    color: "#ffffff",
    borderRadius: "10px",
    padding: "12px 22px",
    fontSize: "15px",
    fontWeight: 500,
    textDecoration: "none",
    display: "inline-block",
  },
};

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  const company = emailCompany();
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f5f5f7", fontFamily: font, margin: 0, padding: "40px 16px" }}>
        <Container style={{ maxWidth: "520px", margin: "0 auto" }}>
          <Text style={{ fontSize: "15px", fontWeight: 600, color: "#1d1d1f", margin: "0 0 20px 4px" }}>{company}</Text>
          <Section style={{ backgroundColor: "#ffffff", borderRadius: "18px", padding: "36px 32px" }}>{children}</Section>
          <Hr style={{ borderColor: "transparent", margin: "16px 0" }} />
          <Text style={{ ...styles.muted, textAlign: "center" }}>Sent by {company} with Loop.</Text>
        </Container>
      </Body>
    </Html>
  );
}
