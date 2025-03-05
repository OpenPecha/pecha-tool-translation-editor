const server_url = import.meta.env.VITE_SERVER_URL;
 
 export const fetchDocuments = async (token:string) => {
    try {
      const response = await fetch(`${server_url}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  export const fetchDocument = async (id:string,token:string) => {
    try {
      const response = await fetch(`${server_url}/documents/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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