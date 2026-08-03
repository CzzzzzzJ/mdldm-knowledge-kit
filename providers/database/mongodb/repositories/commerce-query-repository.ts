import type { CommerceQueryRepository } from "@/modules/commerce";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { ProductModel } from "@/providers/database/mongodb/models/commerce";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";

export function createMongoCommerceQueryRepository(): CommerceQueryRepository {
  return {
    async getAdminProductWorkspace() {
      await connectMongo();
      const [products, courses, series] = await Promise.all([
        ProductModel.find().sort({ active: -1, createdAt: -1 }).lean(),
        CourseModel.find().sort({ createdAt: -1 }).select("title status").lean(),
        SeriesModel.find().sort({ createdAt: -1 }).select("title status").lean(),
      ]);

      return {
        products: products.map((product) => ({
          id: product._id.toString(),
          sku: product.sku,
          title: product.title,
          description: product.description,
          amountInMinorUnits: product.amountInMinorUnits,
          currency: product.currency,
          entitlementType: product.entitlementType,
          entitlementTargetId: product.entitlementTargetId,
          entitlementDurationDays: product.entitlementDurationDays,
          active: product.active,
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString(),
        })),
        targets: {
          courses: courses.map((course) => ({
            id: course._id.toString(),
            title: course.title,
            status: course.status,
          })),
          series: series.map((item) => ({
            id: item._id.toString(),
            title: item.title,
            status: item.status,
          })),
        },
      };
    },
  };
}
