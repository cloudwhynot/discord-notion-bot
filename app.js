const { Client } = require("@notionhq/client")
const dotenv = require("dotenv")
dotenv.config();

const notion = new Client({
    auth: process.env.NOTION_KEY
});

const database_id = process.env.NOTION_DATABASE_ID;

(async () => {
    const allPages = await notion.search({
        query: '',
        filter: {
            value: 'page',
            property: 'object',
        },
    });
    console.log(allPages.results);
})()