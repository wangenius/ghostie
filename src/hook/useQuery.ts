import { useLocation } from "react-router-dom";

export function useQuery(key: string) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const value = searchParams.get(key);
  console.log(value);
  return searchParams.get(key);
}
