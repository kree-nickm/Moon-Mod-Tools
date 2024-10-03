/**
 * Templates for messages sent by the Bot, used by multiple modules.
 * @module imports/messageTemplates
 */

/**
 * Convert an Attachment into an embedded message.
 * @param {Object} options
 * @param {discord.js/Attachment} options.attachment - The Attachment object reported by Discord.js
 * @param {Object} options.overwrites - Properties to include in the embed object after it has been populated with Attachment data.
 * @returns {Object} An object to be included in the embeds array of a message's options before sending it.
 */
export async function attachmentDetails({attachment, overwrites={}}={}) {
  let embed = {
    fields: [
      {
        name: 'Name',
        value: attachment.name ?? '?',
      },
      {
        name: 'Content Type',
        value: attachment.contentType ?? '?',
      },
      {
        name: 'Size (Bytes)',
        value: attachment.size ?? '?',
      },
    ],
  };
  
  if (attachment.title)
    embed.fields.push({
      name: 'Title',
      value: attachment.title,
    });
  
  if (attachment.description)
    embed.fields.push({
      name: 'Description',
      value: attachment.description,
    });
  
  if(attachment.width && attachment.height)
    embed.fields.push({
      name: 'Size (Pixels)',
      value: `${attachment.width}x${attachment.height}`,
    });
  
  if (attachment.duration)
    embed.fields.push({
      name: 'Duration',
      value: `${attachment.duration}s`,
    });
  
  return Object.assign(embed, overwrites);
}
