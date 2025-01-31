import type { Database } from '@/server/db'

import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { FriendshipStatusSchema } from '@/utils/server/friendship-schemas'
import { protectedProcedure } from '@/server/trpc/procedures'
import { router } from '@/server/trpc/router'
import {
  NonEmptyStringSchema,
  CountSchema,
  IdSchema,
} from '@/utils/server/base-schemas'

export const myFriendRouter = router({
  getById: protectedProcedure
    .input(
      z.object({
        friendUserId: IdSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.connection().execute(async (conn) =>
        /**
         * Question 4: Implement mutual friend count
         *
         * Add `mutualFriendCount` to the returned result of this query. You can
         * either:
         *  (1) Make a separate query to count the number of mutual friends,
         *  then combine the result with the result of this query
         *  (2) BONUS: Use a subquery (hint: take a look at how
         *  `totalFriendCount` is implemented)
         *
         * Instructions:
         *  - Go to src/server/tests/friendship-request.test.ts, enable the test
         * scenario for Question 3
         *  - Run `yarn test` to verify your answer
         *
         * Documentation references:
         *  - https://kysely-org.github.io/kysely/classes/SelectQueryBuilder.html#innerJoin
         */
        // Get the friend's profile
        conn
          .selectFrom('users as friends')
          .innerJoin('friendships', 'friendships.friendUserId', 'friends.id')
          .innerJoin(
            userTotalFriendCount(conn).as('userTotalFriendCount'),
            'userTotalFriendCount.userId',
            'friends.id'
          )
          .leftJoin(
            mutualFriendCount(conn, {
              userId: ctx.session.userId,
              friendUserId: input.friendUserId,
            }).as('mutualFriendCount'),
            'mutualFriendCount.friendUserId',
            'friends.id'
          )
          .where('friendships.userId', '=', ctx.session.userId)
          .where('friendships.friendUserId', '=', input.friendUserId)
          .where(
            'friendships.status',
            '=',
            FriendshipStatusSchema.Values['accepted']
          )
          .select([
            'friends.id',
            'friends.fullName',
            'friends.phoneNumber',
            'totalFriendCount',
            'mutualFriendCount',
          ])
          .executeTakeFirstOrThrow(() => new TRPCError({ code: 'NOT_FOUND' }))
          .then(
            z.object({
              id: IdSchema,
              fullName: NonEmptyStringSchema,
              phoneNumber: NonEmptyStringSchema,
              totalFriendCount: CountSchema,
              mutualFriendCount: CountSchema,
            }).parse
          )
      )
    }),
  getAll: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.db.connection().execute(async (conn) =>
      // Get all friends of the user and their total friend count and mutual friend count
      conn
        .selectFrom('users as friends')
        .innerJoin('friendships', 'friendships.friendUserId', 'friends.id')
        .innerJoin(
          userTotalFriendCount(conn).as('userTotalFriendCount'),
          'userTotalFriendCount.userId',
          'friends.id'
        )
        .leftJoin(
          mutualFriendsCount(conn, {
            userId: ctx.session.userId,
          }).as('mutualFriendCount'),
          'mutualFriendCount.friendUserId',
          'friends.id'
        )
        .where('friendships.userId', '=', ctx.session.userId)
        .where(
          'friendships.status',
          '=',
          FriendshipStatusSchema.Values['accepted']
        )
        .select([
          'friends.id',
          'friends.fullName',
          'friends.phoneNumber',
          'totalFriendCount',
          'mutualFriendCount',
        ])
        .execute()
        .then(
          z.array(
            z.object({
              id: IdSchema,
              fullName: NonEmptyStringSchema,
              phoneNumber: NonEmptyStringSchema,
              totalFriendCount: CountSchema,
              mutualFriendCount: CountSchema,
            })
          ).parse
        )
    )
  }),
})

const userTotalFriendCount = (db: Database) => {
  return db
    .selectFrom('friendships')
    .where('friendships.status', '=', FriendshipStatusSchema.Values['accepted'])
    .select((eb) => [
      'friendships.userId',
      eb.fn.count('friendships.friendUserId').as('totalFriendCount'),
    ])
    .groupBy('friendships.userId')
}
const mutualFriendCount = (
  db: Database,
  {
    friendUserId,
    userId,
  }: {
    friendUserId: number
    userId: number
  }
) => {
  //get all mutual friends of user and friend
  return db
    .with('acceptedFriendships', (db) =>
      db
        .selectFrom('friendships')
        .where(
          'friendships.status',
          '=',
          FriendshipStatusSchema.Values['accepted']
        )
        .select(['friendships.friendUserId', 'friendships.userId'])
    )
    .with('userFriends', (db) =>
      db
        .selectFrom('acceptedFriendships')
        .where('acceptedFriendships.userId', '=', userId)
        .select([
          'acceptedFriendships.friendUserId',
          'acceptedFriendships.userId',
        ])
    )
    .with('friendFriends', (db) =>
      db
        .selectFrom('acceptedFriendships')
        .where('acceptedFriendships.userId', '=', friendUserId)
        .select([
          'acceptedFriendships.friendUserId',
          'acceptedFriendships.userId',
        ])
    )
    .selectFrom('userFriends')
    .innerJoin(
      'friendFriends',
      'friendFriends.friendUserId',
      'userFriends.friendUserId'
    )
    .select((eb) => [
      'userFriends.userId',
      'friendFriends.userId as friendUserId',
      eb.fn.count('friendFriends.friendUserId').as('mutualFriendCount'),
    ])
}

const mutualFriendsCount = (
  db: Database,
  {
    userId,
  }: {
    userId: number
  }
) => {
  //get all mutual friends of user and friend
  return db
    .with('acceptedFriendships', (db) =>
      db
        .selectFrom('friendships')
        .where(
          'friendships.status',
          '=',
          FriendshipStatusSchema.Values['accepted']
        )
        .select(['friendships.friendUserId', 'friendships.userId'])
    )
    .with('userFriends', (db) =>
      db
        .selectFrom('acceptedFriendships')
        .where('acceptedFriendships.userId', '=', userId)
        .select([
          'acceptedFriendships.friendUserId',
          'acceptedFriendships.userId',
        ])
    )
    .with('friendFriends', (db) =>
      db
        .selectFrom('acceptedFriendships')
        .select([
          'acceptedFriendships.friendUserId',
          'acceptedFriendships.userId',
        ])
    )
    .selectFrom('userFriends')
    .innerJoin('friendFriends', (join) =>
      join
        .onRef('friendFriends.friendUserId', '=', 'userFriends.friendUserId')
        .onRef('friendFriends.userId', '!=', 'userFriends.userId')
    )
    .groupBy(['userFriends.userId', 'userFriends.friendUserId'])
    .select((eb) => [
      'userFriends.userId',
      'userFriends.friendUserId',
      eb.fn.count('friendFriends.friendUserId').as('mutualFriendCount'),
    ])
}
