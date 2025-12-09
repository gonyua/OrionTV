import { useEffect, useState } from "react";
import { api, BoxOfficeResponse } from "@/services/api";

interface UseBoxOfficeRankingsResult {
  globalBoxOffice: BoxOfficeResponse | null;
  chinaBoxOffice: BoxOfficeResponse | null;
  loading: boolean;
  error: string | null;
}

export const useBoxOfficeRankings = (enabled: boolean): UseBoxOfficeRankingsResult => {
  const [globalBoxOffice, setGlobalBoxOffice] = useState<BoxOfficeResponse | null>(null);
  const [chinaBoxOffice, setChinaBoxOffice] = useState<BoxOfficeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const fetchBoxOffice = async () => {
      setLoading(true);
      setError(null);

      try {
        const [globalRes, chinaRes] = await Promise.all([
          api.getGlobalBoxOffice(),
          api.getChinaBoxOffice(),
        ]);

        if (!cancelled) {
          setGlobalBoxOffice(globalRes);
          setChinaBoxOffice(chinaRes);
        }
      } catch (err: any) {
        if (!cancelled) {
          let message = "加载票房榜单失败，请稍后重试";
          if (err?.message === "API_URL_NOT_SET") {
            message = "请在设置中配置服务器地址以加载票房榜单";
          }
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchBoxOffice();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    globalBoxOffice,
    chinaBoxOffice,
    loading,
    error,
  };
};

