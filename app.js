const { Client } = require("@notionhq/client");
const dotenv = require("dotenv");
const axios = require('axios');
const qs = require('qs');
dotenv.config();

const notion = new Client({
    auth: process.env.NOTION_KEY
});

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

const discordUsersID = {
    dreamxgod: '272007277274333184',
    cloud: '173362693502140416',
}

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
                    task_name: currentPage.task_name,
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

    const outDatedPages = curr.reduce((acc, currentPage) => {
        if (today > currentPage.due_date) {
            const assigneesDiscordID = currentPage.assignee.map(user => {
                for (let key in discordUsersID) {
                    if (user == key) {
                        return discordUsersID[key];
                    };
                }
            })

            return [
                ...acc,
                {
                    id: currentPage.id,
                    task_name: currentPage.task_name,
                    url: currentPage.url,
                    assignee: assigneesDiscordID,
                }
            ];
        } else {
            return acc;
        }
    }, [])

    //console.log(outDatedPages);

    return {
        outDatedPages,
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
                task_name: page.properties.Name.title.find(obj => obj.plain_text).plain_text,
                url: page.url,
                assignee: page.properties.Assignee.people.map(item => item.name),
                due_date: page.properties['Due Date'].date.start
            }));

        //console.log(currentPages);

        if (previousPages) {
            const diff = differ(previousPages, currentPages);

            if (diff.createdPages.length) {
                axios({
                    method: 'post',
                    url: webhookUrl,
                    data: qs.stringify({
                        content: `Task "${diff.createdPages.task_name}" was deleted`
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
                        content: `Task "${diff.deletedPages.task_name}" was deleted`
                    }),
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    }
                });
            }

            deadLines = deadLineTrack(currentPages);
            console.log(deadLines.outDatedPages);
            if (deadLines.outDatedPages.length) {
                deadLines.outDatedPages.forEach(page => {
                    axios({
                        method: 'post',
                        url: webhookUrl,
                        data: qs.stringify({
                            content: `Task "${page.task_name}" is expired \nLink: ${page.url}\n<@${page.assignee[0]}>`
                        }),
                        headers: {
                            'content-type': 'application/x-www-form-urlencoded'
                        }
                    });
                })
            }

        }

        previousPages = currentPages;
    })();
}, 4000)