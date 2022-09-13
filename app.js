const { Client } = require("@notionhq/client");
const dotenv = require("dotenv");
const axios = require('axios');
const qs = require('qs');
dotenv.config();

const notion = new Client({
    auth: process.env.NOTION_KEY
});

const database_id = process.env.NOTION_DATABASE_ID;

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

let previousPages;

const differ = (prev, curr) => {
    const deletedPages = prev.reduce((acc, currentPage) => {
        if (!curr.find(item => item.id === currentPage.id)) {
            return [
                ...acc,
                {
                    id: currentPage.id,
                }
            ];
        } else {
            return acc;
        }
    }, [])

    const createdPages = curr.reduce((acc, currentPage) => {
        if (!prev.find(item => item.id === currentPage.id)) {
            return [
                ...acc,
                {
                    id: currentPage.id,
                }
            ];
        } else {
            return acc;
        }
    }, [])

    return {
        deletedPages,
        createdPages,
    }
};

setInterval(() => {
    (async () => {
        const allPages = await notion.search({
            query: '',
            filter: {
                value: 'page',
                property: 'object',
            },
        });

        const currentPages = allPages.results
            .map(page => ({
                id: page.id,
                url: page.url,
            }));

        if (previousPages) {
            const diff = differ(previousPages, currentPages);

            if (diff.createdPages.length) {
                axios({
                    method: 'post',
                    url: webhookUrl,
                    data: qs.stringify({
                        content: `Pages ${JSON.stringify(diff.createdPages)} was created`
                    }),
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    }
                });
            }

            if (diff.deletedPages.length) {
                axios({
                    method: 'post',
                    url: webhookUrl,
                    data: qs.stringify({
                        content: `Pages ${JSON.stringify(diff.deletedPages)} was deleted`
                    }),
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    }
                });
            }
        }

        previousPages = currentPages;
    })();
}, 1000)