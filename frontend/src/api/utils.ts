
type CustomHeaders = Record<string, string>;

const getBaseHeaders = (): CustomHeaders => {
  const token = localStorage.getItem("access_token");
  return {
    Authorization: `Bearer ${token}`,
  };
};

export const getHeaders = (): CustomHeaders => ({
  ...getBaseHeaders(),
  'Content-Type': 'application/json',
});

export const getHeadersMultipart = (): CustomHeaders => getBaseHeaders();
