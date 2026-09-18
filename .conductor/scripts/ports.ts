export function getLocalPort(value: string | undefined): number {
  const port = Number(value);
  if (
    !/^\d+$/.test(value ?? "") ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65534
  ) {
    throw new Error("CONDUCTOR_PORT must be an allocated TCP port");
  }
  return port;
}
