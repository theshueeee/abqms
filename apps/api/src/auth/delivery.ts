export type PasswordResetDelivery = (input: {
  email: string;
  token: string;
}) => Promise<void>;

export const deliverPasswordResetToken: PasswordResetDelivery = async ({ email }) => {
  console.info("Password reset delivery requested", { account: email });
};
