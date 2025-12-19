export interface CctvChannel {
  id: string;
  name: string;
  pid: string;
}

export const CCTV_CHANNELS: CctvChannel[] = [
  { id: "cctv1", name: "CCTV1", pid: "600001859" },
  { id: "cctv2", name: "CCTV2", pid: "600001800" },
  { id: "cctv3", name: "CCTV3", pid: "600001801" },
  { id: "cctv4", name: "CCTV4", pid: "600001814" },
  { id: "cctv5", name: "CCTV5", pid: "600001818" },
  { id: "cctv6", name: "CCTV6", pid: "600108442" },
  { id: "cctv7", name: "CCTV7", pid: "600004092" },
  { id: "cctv8", name: "CCTV8", pid: "600001803" },
  { id: "cctv9", name: "CCTV9", pid: "600004078" },
  { id: "cctv10", name: "CCTV10", pid: "600001805" },
  { id: "cctv11", name: "CCTV11", pid: "600001806" },
  { id: "cctv12", name: "CCTV12", pid: "600001807" },
  { id: "cctv13", name: "CCTV13", pid: "600001811" },
  { id: "cctv14", name: "CCTV14", pid: "600001809" },
  { id: "cctv15", name: "CCTV15", pid: "600001815" },
  { id: "cctv16", name: "CCTV16", pid: "600098637" },
  { id: "cctv17", name: "CCTV17", pid: "600001810" },
];

export const findCctvIndexByPid = (pid: string | undefined | null): number => {
  if (!pid) return -1;
  return CCTV_CHANNELS.findIndex((channel) => channel.pid === pid);
};

