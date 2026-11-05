export async function logoutToSignedOut(logout, navigate) {
  await logout({ redirectToSignedOut: true });
  navigate("/signed-out", { replace: true });
}
