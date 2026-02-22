import { redirect } from 'next/navigation';
// Registration is handled via the AuthPanel on the home page
export default function RegisterPage() {
  redirect('/');
}
