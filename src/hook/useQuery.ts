import { useLocation } from "react-router-dom";

export function useQuery(key: string) {
  const location = useLocation();
  console.log(location);
  const searchParams = new URLSearchParams(location.search);
  console.log(searchParams.get(key));
  return searchParams.get(key);
}
