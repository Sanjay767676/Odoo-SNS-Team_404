// Simple script to delete test users via API
const API_URL = "http://localhost:5000/api/users/cleanup";

async function deleteUsers() {
    try {
        const response = await fetch(API_URL, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                roles: ["internal", "user"] // Delete both internal and external users
            }),
            credentials: "include", // Important for session cookies
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("❌ Error:", error);
            process.exit(1);
        }

        const result = await response.json();
        console.log("✅ Success!");
        console.log(`Deleted ${result.deleted.length} users:`);
        result.deleted.forEach((u: any) => {
            console.log(`  - ${u.email} (${u.name}) - ${u.role}`);
        });

    } catch (err) {
        console.error("❌ Failed to connect:", err);
        process.exit(1);
    }
}

deleteUsers();
