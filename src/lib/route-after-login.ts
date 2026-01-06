export const routeAfterLogin = (userType: "buyer" | "vendor" | "admin") => {
  switch (userType) {
    case "admin":
      return "/admin";
    case "vendor":
      return "/vendor";
    case "buyer":
    default:
      return "/buyer/dashboard";
  }
};
