import { googleAuthEnabled } from "@/lib/auth";

import { AuthPanel } from "../../components/auth-dialog";

export default function SignUpPage() {
  return <AuthPanel googleEnabled={googleAuthEnabled} intent="signup" />;
}
