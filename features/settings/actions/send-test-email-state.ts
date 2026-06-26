export type TestEmailFormState = {
  fieldErrors: {
    recipientEmail?: string;
    form?: string;
  };
  successMessage?: string;
};

export const initialTestEmailFormState: TestEmailFormState = {
  fieldErrors: {},
};
