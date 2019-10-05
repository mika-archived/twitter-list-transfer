import Twtr from "twitter";

import { List, User } from "./types";

export class Twitter {
  private twtr: Twtr;

  public constructor(consumerKey: string, consumerSecret: string, accessToken: string, accessTokenSecret: string) {
    this.twtr = new Twtr({
      access_token_key: accessToken,
      access_token_secret: accessTokenSecret,
      consumer_key: consumerKey,
      consumer_secret: consumerSecret
    });
  }

  public async verifyCredentialsAsync(): Promise<User> {
    return (await this.twtr.get("account/verify_credentials", {})) as User;
  }

  public async fetchListsAsync(screenName: string): Promise<List[]> {
    return (await this.twtr.get("lists/list", { screen_name: screenName })) as List[];
  }

  public async fetchListMembersAsync(id: string): Promise<User[]> {
    return (await this.twtr.get("lists/members", {
      list_id: id,
      count: 5000,
      skip_status: true,
      include_entities: false
    })).users as User[];
  }

  public async createListAsync(name: string, mode: string, description: string): Promise<List> {
    return (await this.twtr.post("lists/create", { name, mode, description })) as List;
  }

  public async addListMembersBulk(id: string, userIds: string[]): Promise<void> {
    await this.twtr.post("lists/members/create_all", { list_id: id, user_id: userIds.join(",") });
  }
}
