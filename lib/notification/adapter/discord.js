const { markdown2Html } = require('../../services/markdown');
const { getJob } = require('../../services/storage/jobStorage');
const axios = require('axios');

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

  let message = `### *${jobName}* (${serviceName}) found **${newListings.length}** new listings:\n\n`;
  message += `| Title | Address | Size | Price |\n`;
  message += newListings.map(
    (o) => `| [${o.title}](${o.link}) | ` + [o.address, o.size.replace(/2m/g, '$m^2$'), o.price].join(' | ') + ' |\n'
  );

  return axios.post(`${webhook}`, {
    content: message,
  });
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