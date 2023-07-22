import { describe, test } from 'vitest'

import { FriendshipStatusSchema } from '@/utils/server/friendship-schemas'

import { createUser } from './utils'

describe.concurrent('Friendship request', async () => {
  /**
   * Scenario:
   *  1. User A sends a friendship request to user B
   *  2. User B accepts the friendship request
   */
  test('Question 1 / Scenario 1', async ({ expect }) => {
    const [userA, userB] = await Promise.all([createUser(), createUser()])

    await userA.sendFriendshipRequest({
      friendUserId: userB.id,
    })

    await userB.acceptFriendshipRequest({
      friendUserId: userA.id,
    })

    await expect(
      userA.getFriendById({ friendUserId: userB.id })
    ).resolves.toEqual(
      expect.objectContaining({
        id: userB.id,
      })
    )

    await expect(
      userB.getFriendById({ friendUserId: userA.id })
    ).resolves.toEqual(
      expect.objectContaining({
        id: userA.id,
      })
    )
  })

  /**
   * Scenario:
   *  1. User A sends a friendship request to user B
   *  2. User B sends a friendship request to user A
   *  3. User A accepts the friendship request
   */
  test('Question 1 / Scenario 2', async ({ expect }) => {
    const [userA, userB] = await Promise.all([createUser(), createUser()])

    await userA.sendFriendshipRequest({
      friendUserId: userB.id,
    })

    await userB.sendFriendshipRequest({
      friendUserId: userA.id,
    })

    await userA.acceptFriendshipRequest({
      friendUserId: userB.id,
    })

    await expect(
      userA.getFriendById({ friendUserId: userB.id })
    ).resolves.toEqual(
      expect.objectContaining({
        id: userB.id,
      })
    )

    await expect(
      userB.getFriendById({ friendUserId: userA.id })
    ).resolves.toEqual(
      expect.objectContaining({
        id: userA.id,
      })
    )
  })

  /**
   * Scenario:
   *  1. User A sends a friendship request to user B
   *  2. User B declines the friendship request
   */
  test('Question 2 / Scenario 1', async ({ expect }) => {
    const [userA, userB] = await Promise.all([createUser(), createUser()])

    await expect(
      userA.sendFriendshipRequest({
        friendUserId: userB.id,
      })
    ).resolves.not.toThrow()

    await expect(
      userA.getMyOutgoingFriendshipRequests()
    ).resolves.toContainEqual(
      expect.objectContaining({
        friendUserId: userB.id,
        status: FriendshipStatusSchema.Values['requested'],
      })
    )

    await userB.declineFriendshipRequest({
      friendUserId: userA.id,
    })

    await expect(
      userA.getMyOutgoingFriendshipRequests()
    ).resolves.toContainEqual(
      expect.objectContaining({
        friendUserId: userB.id,
        status: FriendshipStatusSchema.Values['declined'],
      })
    )
  })

  /**
   * Scenario:
   *  1. User A sends a friendship request to user B
   */
  test('Question 3 / Scenario 1', async ({ expect }) => {
    const [userA, userB] = await Promise.all([createUser(), createUser()])

    await expect(
      userA.sendFriendshipRequest({
        friendUserId: userB.id,
      })
    ).resolves.not.toThrow()

    await expect(
      userA.getMyOutgoingFriendshipRequests()
    ).resolves.toContainEqual(
      expect.objectContaining({
        friendUserId: userB.id,
        status: FriendshipStatusSchema.Values['requested'],
      })
    )
  })

  /**
   * Scenario:
   *  1. User A sends a friendship request to user B
   *  2. User B declines the request
   *  3. User A re-sends a new friendship request to user B
   */
  test('Question 3 / Scenario 2', async ({ expect }) => {
    const [userA, userB] = await Promise.all([createUser(), createUser()])

    await userA.sendFriendshipRequest({
      friendUserId: userB.id,
    })

    await userB.declineFriendshipRequest({
      friendUserId: userA.id,
    })

    await userA.sendFriendshipRequest({
      friendUserId: userB.id,
    })

    await expect(
      userA.getMyOutgoingFriendshipRequests()
    ).resolves.toContainEqual(
      expect.objectContaining({
        friendUserId: userB.id,
        status: FriendshipStatusSchema.Values['requested'],
      })
    )
  })

  /**
   * Scenario:
   *  1. User B, C, D, E send friendship requests to user A
   *  2. User A accepts all the requests
   *
   *  -> User A should have a total of 4 friends
   */
  test('Question 4 / Scenario 1', async ({ expect }) => {
    const [userA, userB, userC, userD, userE] = await Promise.all([
      createUser(),
      createUser(),
      createUser(),
      createUser(),
      createUser(),
    ])

    await Promise.all([
      userB.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userC.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userD.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userE.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
    ])

    await Promise.all([
      userA.acceptFriendshipRequest({
        friendUserId: userB.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userC.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userD.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userE.id,
      }),
    ])

    await expect(
      userB.getFriendById({
        friendUserId: userA.id,
      })
    ).resolves.toEqual(
      expect.objectContaining({
        id: userA.id,
        totalFriendCount: 4,
      })
    )
  })

  /**
   * Scenario:
   *  1. User B, C, D, E send friendship requests to user A
   *  2. User C sends a friendship request to user B
   *  3. User A accepts all the requests
   *  4. User B accepts user C's request
   *
   *  -> User A should have 1 mutual friend with user B
   */
  test('Question 4 / Scenario 2', async ({ expect }) => {
    const [userA, userB, userC, userD, userE] = await Promise.all([
      createUser(),
      createUser(),
      createUser(),
      createUser(),
      createUser(),
    ])

    await Promise.all([
      userB.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userC.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userD.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userE.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userC.sendFriendshipRequest({
        friendUserId: userB.id,
      }),
    ])

    await Promise.all([
      userA.acceptFriendshipRequest({
        friendUserId: userB.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userC.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userD.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userE.id,
      }),
      userB.acceptFriendshipRequest({
        friendUserId: userC.id,
      }),
    ])

    await expect(
      userB.getFriendById({
        friendUserId: userA.id,
      })
    ).resolves.toEqual(
      expect.objectContaining({
        id: userA.id,
        mutualFriendCount: 1,
      })
    )
  })

  /**
   * Scenario:
   *  1. User B, C, D, E send friendship requests to user A
   *  2. User C,D sends  friendship requests to user B
   *  3. User A accepts all the requests
   *  4. User B accepts all the requests
   *
   *  -> User A should have 2 mutual friend with user B
   */
  test('Question 4 / Scenario 3', async ({ expect }) => {
    const [userA, userB, userC, userD, userE] = await Promise.all([
      createUser(),
      createUser(),
      createUser(),
      createUser(),
      createUser(),
    ])

    await Promise.all([
      userB.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userC.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userD.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userE.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userC.sendFriendshipRequest({
        friendUserId: userB.id,
      }),
      userD.sendFriendshipRequest({
        friendUserId: userB.id,
      }),
    ])

    await Promise.all([
      userA.acceptFriendshipRequest({
        friendUserId: userB.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userC.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userD.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userE.id,
      }),
      userB.acceptFriendshipRequest({
        friendUserId: userC.id,
      }),
      userB.acceptFriendshipRequest({
        friendUserId: userD.id,
      }),
    ])
    //= > should have 2 mutual friends
    await expect(
      userB.getFriendById({
        friendUserId: userA.id,
      })
    ).resolves.toEqual(
      expect.objectContaining({
        id: userA.id,
        mutualFriendCount: 2,
      })
    )
  })

  /**
   * Scenario:
   *  1. User B, C, D, E send friendship requests to user A
   *  2. User A accepts all the requests
   *
   *  -> User A should have 0 mutual friend with user B
   */
  test('Question 4 / Scenario 4', async ({ expect }) => {
    const [userA, userB, userC, userD, userE] = await Promise.all([
      createUser(),
      createUser(),
      createUser(),
      createUser(),
      createUser(),
    ])

    await Promise.all([
      userB.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userC.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userD.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userE.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
    ])

    await Promise.all([
      userA.acceptFriendshipRequest({
        friendUserId: userB.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userC.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userD.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userE.id,
      }),
    ])
    //= > should have 0 mutual friends
    await expect(
      userB.getFriendById({
        friendUserId: userA.id,
      })
    ).resolves.toEqual(
      expect.objectContaining({
        id: userA.id,
        mutualFriendCount: 0,
      })
    )
  })

  test('Question 5 / Scenario 1', async ({ expect }) => {
    const [userA, userB, userC, userD, userE] = await Promise.all([
      createUser(),
      createUser(),
      createUser(),
      createUser(),
      createUser(),
    ])

    await Promise.all([
      userB.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userC.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userD.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userE.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userC.sendFriendshipRequest({
        friendUserId: userB.id,
      }),
      userD.sendFriendshipRequest({
        friendUserId: userB.id,
      }),
    ])

    await Promise.all([
      userA.acceptFriendshipRequest({
        friendUserId: userB.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userC.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userD.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userE.id,
      }),
      userB.acceptFriendshipRequest({
        friendUserId: userC.id,
      }),
      userB.acceptFriendshipRequest({
        friendUserId: userD.id,
      }),
    ])
    /**
     * A friends: B,C,D,E
     * B friends: A,C,D
     * C friends: A,B
     * D friends: A,B
     * E friends: A
     *
     * -> User B should have 2 mutual friend with user A => C,D
     * -> User C should have 1 mutual friend with user A => B
     * -> User D should have 1 mutual friend with user A => B
     * -> User E should have 0 mutual friend with user A
     */
    await expect(userA.getAllFriends()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: userB.id,
          mutualFriendCount: 2,
        }),
        expect.objectContaining({
          id: userC.id,
          mutualFriendCount: 1,
        }),
        expect.objectContaining({
          id: userD.id,
          mutualFriendCount: 1,
        }),
        expect.objectContaining({
          id: userE.id,
          mutualFriendCount: 0,
        }),
      ])
    )
  })

  test('Question 5 / Scenario 2', async ({ expect }) => {
    const [userA, userB, userC, userD, userE] = await Promise.all([
      createUser(),
      createUser(),
      createUser(),
      createUser(),
      createUser(),
    ])

    await Promise.all([
      userB.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userC.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userD.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userE.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userC.sendFriendshipRequest({
        friendUserId: userB.id,
      }),
      userC.sendFriendshipRequest({
        friendUserId: userD.id,
      }),
      userD.sendFriendshipRequest({
        friendUserId: userB.id,
      }),
    ])

    await Promise.all([
      userA.acceptFriendshipRequest({
        friendUserId: userB.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userC.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userD.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userE.id,
      }),
      userB.acceptFriendshipRequest({
        friendUserId: userC.id,
      }),
      userB.acceptFriendshipRequest({
        friendUserId: userD.id,
      }),
      userD.acceptFriendshipRequest({
        friendUserId: userC.id,
      }),
    ])
    /**
     * A friends: B,C,D,E
     * B friends: A,C,D
     * C friends: A,B,D
     * D friends: A,B,C
     * E friends: A
     *
     * -> User B should have 2 mutual friend with user A => C,D
     * -> User C should have 2 mutual friend with user A => B,D
     * -> User D should have 2 mutual friend with user A => B,C
     * -> User E should have 0 mutual friend with user A
     */
    await expect(userA.getAllFriends()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: userB.id,
          mutualFriendCount: 2,
        }),
        expect.objectContaining({
          id: userC.id,
          mutualFriendCount: 2,
        }),
        expect.objectContaining({
          id: userD.id,
          mutualFriendCount: 2,
        }),
        expect.objectContaining({
          id: userE.id,
          mutualFriendCount: 0,
        }),
      ])
    )
  })

  test('Question 5 / Scenario 3', async ({ expect }) => {
    const [userA, userB, userC, userD, userE] = await Promise.all([
      createUser(),
      createUser(),
      createUser(),
      createUser(),
      createUser(),
    ])

    await Promise.all([
      userB.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userC.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userD.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userE.sendFriendshipRequest({
        friendUserId: userA.id,
      }),
      userC.sendFriendshipRequest({
        friendUserId: userB.id,
      }),
      userC.sendFriendshipRequest({
        friendUserId: userD.id,
      }),
      userD.sendFriendshipRequest({
        friendUserId: userB.id,
      }),
    ])

    await Promise.all([
      userA.acceptFriendshipRequest({
        friendUserId: userB.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userC.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userD.id,
      }),
      userA.acceptFriendshipRequest({
        friendUserId: userE.id,
      }),
    ])
    /**
     * A friends: B,C,D,E
     * B friends: A
     * C friends: A
     * D friends: A
     * E friends: A
     *
     * -> User B should have 0 mutual friend with user A
     * -> User C should have 0 mutual friend with user A
     * -> User D should have 0 mutual friend with user A
     * -> User E should have 0 mutual friend with user A
     */
    await expect(userA.getAllFriends()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: userB.id,
          mutualFriendCount: 0,
        }),
        expect.objectContaining({
          id: userC.id,
          mutualFriendCount: 0,
        }),
        expect.objectContaining({
          id: userD.id,
          mutualFriendCount: 0,
        }),
        expect.objectContaining({
          id: userE.id,
          mutualFriendCount: 0,
        }),
      ])
    )
  })
})
