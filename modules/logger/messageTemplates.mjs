/**
 * All of the templates for messages sent by the logger module.
 * @module modules/logger/messageTemplates
 */

/**
 * Convert an Attachment into an embed object.
 * @param {discord.js/Attachment} attachment - The Attachment object reported by Discord.js
 * @param {Object} overwrites - Properties to include in the embed object after it has been populated with Attachment data.
 * @returns {Object} An object to be included in the embeds array of a message's options before sending it.
 */
export async function attachmentToEmbed(attachment, overwrites={}) {
  let embed = {
    fields: [
      {
        name: 'Name',
        value: attachment.name,
      },
      {
        name: 'Content Type',
        value: attachment.contentType,
      },
      {
        name: 'Size (Bytes)',
        value: attachment.size,
      },
    ],
  };
  
  if(attachment.width && attachment.height)
    embed.fields.push({
      name: 'Size (Pixels)',
      value: `${attachment.width}x${attachment.height}`,
    });
  
  if (attachment.contentType.startsWith('audio/'))
    embed.fields.push({
      name: 'Duration',
      value: `${attachment.duration}s`,
    });
  
  return Object.assign(embed, overwrites);
}
