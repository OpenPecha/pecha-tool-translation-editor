import { getHeaders } from "./utils";

const server_url = import.meta.env.VITE_SERVER_URL;
 
 export const fetchDocuments = async () => {
    try {
      const response = await fetch(`${server_url}/documents`, {
        headers: getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
        } catch (error) {
            console.log(error)
    } finally {
    }
  };

  export const fetchDocument = async (id:string) => {
    try {
      const response = await fetch(`${server_url}/documents/${id}`, {
        headers: getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
        } catch (error) {
            console.log(error)
    } finally {
    }
  };

  export const createDocument= async (identifier:string) => {
    const response = await fetch(`${server_url}/documents`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        identifier: identifier,
        docs_prosemirror_delta: {},
        docs_y_doc_state: new Uint8Array()
      })
    });
     return response.json();
  }


  export const updatePermission = async (id:string, email:string, canRead:string, canWrite:string) => {
    try {
      const response = await fetch(`${server_url}/documents/${id}/permissions`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          email,
          canRead,
          canWrite
        })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {error: error?.message}
    }
  };
  export const deleteDocument = async (id:string) => {
    try {
      const response = await fetch(`${server_url}/documents/${id}`, {
        headers: getHeaders(),
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
        } catch (error) {
            console.log(error)
    }
  };