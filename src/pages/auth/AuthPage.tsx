import { Authenticator } from '@aws-amplify/ui-react';
import { Mic } from 'lucide-react';

function AuthHeader() {
  return (
    <div className="text-center mb-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-gradient-to-br from-primary to-secondary shadow-xl shadow-primary/30">
        <Mic size={28} className="text-primary-content" />
      </div>
      <h1 className="text-2xl font-bold text-base-content">LPT Tool</h1>
      <p className="text-base-content/50 text-sm mt-1">Language Proficiency Testing Platform</p>
    </div>
  );
}

const formFields = {
  signUp: {
    given_name: {
      label: 'First Name',
      placeholder: 'Enter your first name',
      order: 1,
    },
    family_name: {
      label: 'Last Name',
      placeholder: 'Enter your last name',
      order: 2,
    },
    email: {
      label: 'Email',
      placeholder: 'Enter your email',
      order: 3,
    },
    password: {
      label: 'Password',
      placeholder: 'Create a password',
      order: 4,
    },
    confirm_password: {
      label: 'Confirm Password',
      placeholder: 'Confirm your password',
      order: 5,
    },
  },
};

export function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthHeader />
        <div className="card overflow-hidden">
          <Authenticator
            formFields={formFields}
            hideSignUp={false}
          />
        </div>
        <p className="text-center text-base-content/30 text-xs mt-4">
          New users are automatically registered as Transcribers.
        </p>
      </div>
    </div>
  );
}
