import { Types } from "mongoose";

import { requireAuthSecret } from "@/config/env";
import { hashInvitationCode } from "@/modules/entitlement/invitation";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { EntitlementModel } from "@/providers/database/mongodb/models/entitlement";
import {
  InvitationModel,
  InvitationRedemptionModel,
} from "@/providers/database/mongodb/models/invitation";

export type RedeemInvitationResult =
  | { ok: true; entitlementId: string; alreadyRedeemed: boolean }
  | { ok: false; reason: "invalid" | "already_redeemed" };

export async function redeemInvitation(input: {
  code: string;
  userId: string;
}): Promise<RedeemInvitationResult> {
  if (!Types.ObjectId.isValid(input.userId)) {
    return { ok: false, reason: "invalid" };
  }

  await connectMongo();
  const now = new Date();
  const invitation = await InvitationModel.findOne({
    codeHash: hashInvitationCode(input.code, requireAuthSecret()),
    status: "active",
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  });
  if (!invitation) {
    return { ok: false, reason: "invalid" };
  }

  const existingRedemption = await InvitationRedemptionModel.findOne({
    invitationId: invitation._id,
    userId: input.userId,
  });
  if (existingRedemption?.entitlementId) {
    return {
      ok: true,
      entitlementId: existingRedemption.entitlementId.toString(),
      alreadyRedeemed: true,
    };
  }
  if (existingRedemption) {
    return { ok: false, reason: "already_redeemed" };
  }

  let reservation;
  try {
    reservation = await InvitationRedemptionModel.create({
      invitationId: invitation._id,
      userId: input.userId,
      entitlementId: null,
      redeemedAt: now,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return { ok: false, reason: "already_redeemed" };
    }
    throw error;
  }

  const claimed = await InvitationModel.findOneAndUpdate(
    {
      _id: invitation._id,
      status: "active",
      $expr: { $lt: ["$redemptionCount", "$maxRedemptions"] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    },
    { $inc: { redemptionCount: 1 } },
    { new: true },
  );

  if (!claimed) {
    await reservation.deleteOne();
    return { ok: false, reason: "invalid" };
  }

  try {
    const endsAt = claimed.durationDays
      ? new Date(now.getTime() + claimed.durationDays * 24 * 60 * 60 * 1_000)
      : null;
    const entitlement = await EntitlementModel.create({
      userId: input.userId,
      type: claimed.entitlementType,
      targetId: claimed.targetId,
      startsAt: now,
      endsAt,
      revokedAt: null,
      sourceType: "invitation",
      sourceId: claimed._id.toString(),
    });

    reservation.entitlementId = entitlement._id;
    await reservation.save();

    return {
      ok: true,
      entitlementId: entitlement._id.toString(),
      alreadyRedeemed: false,
    };
  } catch (error) {
    await Promise.all([
      InvitationModel.updateOne(
        { _id: invitation._id, redemptionCount: { $gt: 0 } },
        { $inc: { redemptionCount: -1 } },
      ),
      reservation.deleteOne(),
    ]);
    throw error;
  }
}
