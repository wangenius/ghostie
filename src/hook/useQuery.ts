import { useLocation } from "react-router-dom";

export function useQuery(key: string) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  return searchParams.get(key);
}
