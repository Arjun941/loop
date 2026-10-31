/**
 * Account emails: welcome, email confirmation, password reset and staff invitation.
 */
import { Button, Text } from "@react-email/components";
import { EmailLayout, styles } from "./layout";

export function WelcomeEmail({ name, portalUrl }: { name: string; portalUrl: string }) {
  return (
    <EmailLayout preview="Your account is ready">
      <Text style={styles.heading}>Welcome, {name.split(" ")[0]}.</Text>
      <Text style={styles.text}>
        Your account is ready. From your portal you can see your subscriptions, download invoices and manage renewals
        without emailing anyone.
      </Text>
      <Button href={portalUrl} style={styles.button}>
        Open your portal
      </Button>
    </EmailLayout>
  );
}

export function PasswordResetEmail({ name, resetUrl, minutes }: { name: string; resetUrl: string; minutes: number }) {
  return (
    <EmailLayout preview="Reset your password">
      <Text style={styles.heading}>Reset your password</Text>
      <Text style={styles.text}>
        Hi {name.split(" ")[0]}, we received a request to reset your password. The link works once and expires in{" "}
        {minutes} minutes.
      </Text>
      <Button href={resetUrl} style={styles.button}>
        Choose a new password
      </Button>
      <Text style={{ ...styles.muted, marginTop: "24px" }}>If you didn&apos;t ask for this, you can ignore this email.</Text>
    </EmailLayout>
  );
}

export function StaffInviteEmail({ name, inviter, inviteUrl }: { name: string; inviter: string; inviteUrl: string }) {
  return (
    <EmailLayout preview={`${inviter} invited you to Loop`}>
      <Text style={styles.heading}>You&apos;re invited</Text>
      <Text style={styles.text}>
        Hi {name.split(" ")[0]}, {inviter} added you to the billing team. Set a password to get started.
      </Text>
      <Button href={inviteUrl} style={styles.button}>
        Set your password
      </Button>
      <Text style={{ ...styles.muted, marginTop: "24px" }}>The link works once and expires in an hour. If it runs out, ask {inviter} to invite you again.</Text>
    </EmailLayout>
  );
}

export function ConfirmEmail({ name, confirmUrl }: { name: string; confirmUrl: string }) {
  return (
    <EmailLayout preview="Confirm your email to finish signing up">
      <Text style={styles.heading}>Confirm your email</Text>
      <Text style={styles.text}>
        Hi {name.split(" ")[0]}, thanks for signing up. Confirm your email and you&apos;re in: your portal
        shows your subscriptions and invoices, and lets you manage renewals.
      </Text>
      <Button href={confirmUrl} style={styles.button}>
        Confirm email
      </Button>
      <Text style={{ ...styles.muted, marginTop: "24px" }}>
        The link works once and expires in an hour. If you didn&apos;t sign up, you can ignore this email.
      </Text>
    </EmailLayout>
  );
}
