export  const getHeaders = ()=> {
    
    const token = localStorage.getItem('token') || ''
    const header={'Authorization': `Bearer ${token}`,
        "Content-Type": "application/json",
    }

    return header
}
