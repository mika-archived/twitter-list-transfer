import ora from "ora";
import prompts from "prompts";

import { Twitter } from "./twitter";
import { List, User } from "./types";

const inputOptions = {
  source: [
    {
      type: "text",
      name: "consumer_key",
      message: "Consumer Key",
      validate: value => value.length >= 1
    },
    {
      type: "password",
      name: "consumer_secret",
      message: "Consumer Secret",
      validate: value => value.length >= 1
    },
    {
      type: "password",
      name: "access_token",
      message: "Access Token",
      validate: value => value.length >= 1
    },
    {
      type: "password",
      name: "access_token_secret",
      message: "Access Token Secret",
      validate: value => value.length >= 1
    }
  ] as prompts.PromptObject<any>[],
  dest: [
    {
      type: "text",
      name: "consumer_key",
      message: "Consumer Key",
      validate: value => value.length >= 1
    },
    {
      type: "password",
      name: "consumer_secret",
      message: "Consumer Secret",
      validate: value => value.length >= 1
    },
    {
      type: "password",
      name: "access_token",
      message: "Access Token",
      validate: value => value.length >= 1
    },
    {
      type: "password",
      name: "access_token_secret",
      message: "Access Token Secret",
      validate: value => value.length >= 1
    }
  ] as prompts.PromptObject<any>[]
};

const createTwitterInstance = async (options: prompts.PromptObject<any>[]): Promise<[Twitter, User]> => {
  const spinner = ora("fetching information...");

  let twitter: Twitter | null = null;
  let user: User | null = null;

  do {
    // eslint-disable-next-line no-await-in-loop
    const response = await prompts(options, {});

    if (!response.consumer_key || !response.consumer_secret || !response.access_token || !response.access_token_secret)
      break;

    twitter = new Twitter(
      response.consumer_key,
      response.consumer_secret,
      response.access_token,
      response.access_token_secret
    );

    spinner.start();

    try {
      // eslint-disable-next-line no-await-in-loop
      user = await twitter.verifyCredentialsAsync();
    } catch (err) {
      console.error(err);

      spinner.fail();
      console.log("try again");
    }
  } while (user == null);

  if (twitter == null || user == null) throw new Error("Application Exited");

  spinner.succeed();

  return [twitter, user!];
};

const transfer = async (source: [List, Twitter], dest: Twitter): Promise<boolean> => {
  const [from, src] = source;
  let to: List;

  try {
    to = await dest.createListAsync(from.name, from.mode, from.description);
  } catch (err) {
    console.log(err);
    return false;
  }

  // fetching list members (batch 100 members)
  const members = await src.fetchListMembersAsync(from.id_str);
  try {
    for (let i = 0; i < members.length / 50; i += 1) {
      const bulks = members.slice(i * 50, (i + 1) * 50);

      // eslint-disable-next-line no-await-in-loop
      await dest.addListMembersBulk(to.id_str, bulks.map(w => w.id_str));
    }
  } catch (err) {
    console.error(err);
    return false;
  }

  return true;
};

const main = async () => {
  console.log("Please input source account credentials");

  const spinner = ora("");
  const [source, sourceUser] = await createTwitterInstance(inputOptions.source);

  spinner.start("fetching verified user's lists...");
  const lists = await source.fetchListsAsync(sourceUser.screen_name);
  if (!lists) {
    spinner.fail("fail to fetch information: lists is empty or invalid");
    return;
  }

  spinner.succeed("lists fetched");

  const choiceInput = await prompts(
    [
      {
        type: "multiselect",
        name: "transfers",
        message: "Select the lists you want to transfer",
        choices: lists.map(w => ({ title: w.name, value: w.id_str }))
      }
    ],
    {}
  );

  if (!choiceInput) {
    console.error("does not select lists, exit application");
    return;
  }

  console.log("Please input dest account information");

  const [dest, destUser] = await createTwitterInstance(inputOptions.dest);

  console.log(`transfer lists from @${sourceUser.screen_name} to @${destUser.screen_name}`);

  spinner.start("transfering...");
  const transfers = lists.filter(w => choiceInput.transfers.includes(w.id_str));

  // eslint-disable-next-line
  for (const list of transfers) {
    // eslint-disable-next-line
    const r = await transfer([list, source], dest);
    if (!r) {
      console.error(`failed to transfer list: ${list.name}`);
    }
  }

  spinner.succeed("transfer finished");
};

main()
  .then(() => process.exit(0))
  .catch(_ => process.exit(1));
