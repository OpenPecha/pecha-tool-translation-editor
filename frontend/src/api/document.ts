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

  export const updatePermission = async (id, userId, canRead, canWrite, token) => {
    try {
      const formData = new URLSearchParams();
      formData.append('userId', userId);
      formData.append('canRead', canRead);
      formData.append('canWrite', canWrite);
      const response = await fetch(`${server_url}/documents/${id}/permissions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });
  
      if (!response.ok) {
        throw new Error("Failed to update permission");
      }
  
      return await response.json();
    } catch (error) {
      console.error("Error updating permission:", error);
    }
  };
  