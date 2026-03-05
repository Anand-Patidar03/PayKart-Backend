const testLogin = async () => {
    try {
        console.log("Attempting login...");
        
        const response = await fetch('http://localhost:7000/api/v1/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'test=1' 
            },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'password123'
            }),
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Login success:", data);
        } else {
            console.log("Login failed with status:", response.status);
            const text = await response.text();
            console.log("Response:", text);
        }
    } catch (error) {
        console.log("Login error:", error.message);
    }
};

testLogin();
