import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { themeForUser } from "./tierTheme";

// The colour theme of the signed-in user (Normal, Premium or Admin); Normal when signed out.
export default function useTheme() {
  const { user } = useContext(AuthContext);
  return themeForUser(user);
}
