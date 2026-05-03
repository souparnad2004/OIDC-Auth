import "dotenv/config"
import { createApp } from "./app.js"
import { db } from "./common/db/index.js";
const port = process.env.PORT;


async function start () {
    try {
        await db.execute("SELECT 1");
        console.log("DB connected Successfully");
    } catch (error) {
        throw error;
    }

    const app = createApp();

    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    })
}

start().catch((err) => {
    console.log("Server start failed due to ERROR: ", err.message);
    process.exit(1);
})