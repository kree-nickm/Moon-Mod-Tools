export async function getOrCreateThread(mailChannel, member)
{
  let activeThreads = await mailChannel.threads.fetchActive();
  let myThread = activeThreads.threads.find(thread => thread.name.startsWith(`${member.user.username} - `));
  if (!myThread) {
    // Count this user's threads so we can append the number to the name.
    // TODO: Store user's threads in a database and use that to count, because this will become an expensive operation eventually.
    let oldThreads = await mailChannel.threads.fetchArchived();
    let myThreads = oldThreads.threads.filter(thread => thread.name.startsWith(`${member.user.username} - `));
    
    myThread = await mailChannel.threads.create({
      name: `${member.user.username} - ${myThreads.size+1}`,
      message: {
        content: `New Thread Placeholder.`,
      },
    });
  }
  return myThread;
};
