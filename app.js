const { Client } = require("@notionhq/client");
const dotenv = require("dotenv");
const axios = require('axios');
const qs = require('qs');
dotenv.config();

const notion = new Client({
    auth: process.env.NOTION_KEY
});

//const database_id = process.env.NOTION_DATABASE_ID;

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

const deadLineTrack = curr => {
    let today = new Date();
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    let yyyy = today.getFullYear();

    today = yyyy + '-' + mm + '-' + dd;

    //console.log(today); 
    //console.log(`${yyyy}-${mm}-${dd}`); 

    const check = curr.reduce((acc, currentPage) => {
        console.log(curr.due_date);
        console.log(today);
        if (today > currentPage.due_date) {
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
        check,
    }
}

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
                assignee: page.properties.Assignee.people.map(item => item.name),
                due_date: page.properties['Due Date'].date.start
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

            deadLines = deadLineTrack(currentPages);
            if (deadLines.check.length) {
                axios({
                    method: 'post',
                    url: webhookUrl,
                    data: qs.stringify({
                        content: `Task is expired`
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