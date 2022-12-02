const { markdown2Html } = require('../../services/markdown');
const { getJob } = require('../../services/storage/jobStorage');
const axios = require('axios');

const MAX_ENTITIES_PER_CHUNK = 8;
const RATE_LIMIT_INTERVAL = 1010;

/**
 * splitting an array into chunks because Discorddxc only allows for messages up to 2000 chars,
 * thus we have to split the message into chunks
 * @param inputArray
 * @param perChunk 
 * @returns 
 */
const arrayChunks = (inputArray, perChunk) => 
  inputArray.reduce((all, one, i) => {
    const ch = Math.floor(i/perChunk);
    all[ch] = [].concat((all[ch]||[]),one);
    return all;
  }, []);

/**
 * sends new listings to mattermost
 * @param serviceName e.g immowelt
 * @param newListings an array with newly found listings
 * @param notificationConfig config of this notification adapter
 * @param jobKey name of the current job that is being executed
 * @returns {Promise<Void> | void}
 */
exports.send = ({ serviceName, newListings, notificationConfig, jobKey }) => {
  const { webhook } = notificationConfig.find((adapter) => adapter.id === 'discord').fields;
  const job = getJob(jobKey);
  const jobName = job == null ? jobKey : job.name;

  // we are splitting messages into chunks, because the messages are going to become too big otherwise and will fail
  const chunks = arrayChunks(newListings, MAX_ENTITIES_PER_CHUNK);

  const promises = chunks.map((chunk) => {
    let message = `### *${jobName}* (${serviceName}) found **${newListings.length}** new listings:\n\n`;
    message += chunk.map((o) => 
      `| [${o.title}](${o.link}) | ` + [o.address, o.size.replace(/2m/g, '$m^2$'), o.price].join(' | ') + ' |\n'
    );

    // Only one message per second is allowed
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.post(webhook, {
          content: message
        })
        .then(() => resolve())
        .catch((err) => reject(err));
      }, RATE_LIMIT_INTERVAL);
    });
  });

  return Promise.all(promises);
};

/**
 * exported config is being used in the frontend to generate the fields
 * incoming values will be the keys (and values) of the fields
 *
 */
exports.config = {
  id: __filename.slice(__dirname.length + 1, -3),
  name: 'Discord',
  readme: markdown2Html('lib/notification/adapter/discord.md'),
  description: 'Fredy will send new listings to your discord channel.',
  fields: {
    webhook: {
      type: 'text',
      label: 'Webhook-URL',
      description: 'The incoming webhook url',
    }
  },
}