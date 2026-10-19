import Client from "../models/Client.model.js";
import Translator from "../models/Translator.model.js";
import TranslationOrder from "../models/TranslationOrder.model.js";

const IN_PROGRESS_STATUSES = [
    "processing",
    "assigned",
    "in_translation",
    "quality_check",
];

export const getAdminDashboard = async (req, res) => {
    try {
        const now = new Date();

        const monthStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        const sixMonthsAgo = new Date(
            now.getFullYear(),
            now.getMonth() - 5,
            1
        );

        const [
            totalClients,
            activeClients,
            totalTranslators,
            activeTranslators,
            jobsInProgress,
            pendingVerifications,
            monthlyRevenue,
            recentClients,
            recentTranslators,
            revenueRecords,
        ] = await Promise.all([
            Client.countDocuments(),
            Client.countDocuments({ isActive: true }),
            Translator.countDocuments(),
            Translator.countDocuments({ isActive: true }),
            TranslationOrder.countDocuments({
                status: { $in: IN_PROGRESS_STATUSES },
            }),
            Translator.find({
                verificationStatus: "pending",
            })
                .select("fullName email nativeLanguage createdAt")
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            TranslationOrder.aggregate([
                {
                    $match: {
                        "payment.status": "paid",
                        createdAt: { $gte: monthStart },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$pricing.total" },
                    },
                },
            ]),
            Client.find()
                .select("fullName email isActive createdAt")
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
            Translator.find()
                .select(
                    "fullName email isActive verificationStatus createdAt"
                )
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
            TranslationOrder.aggregate([
                {
                    $match: {
                        "payment.status": "paid",
                        createdAt: { $gte: sixMonthsAgo },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                        },
                        value: { $sum: "$pricing.total" },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
            ]),
        ]);

        const recentUsers = [
            ...recentClients.map((user) => ({
                id: String(user._id),
                name: user.fullName,
                email: user.email,
                role: "Client",
                status: user.isActive ? "ACTIVE" : "SUSPENDED",
                jobs: null,
                rating: null,
                createdAt: user.createdAt,
            })),
            ...recentTranslators.map((user) => ({
                id: String(user._id),
                name: user.fullName,
                email: user.email,
                role: "Translator",
                status: user.isActive
                    ? user.verificationStatus === "approved"
                        ? "ACTIVE"
                        : "PENDING"
                    : "SUSPENDED",
                jobs: null,
                rating: null,
                createdAt: user.createdAt,
            })),
        ]
            .sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
            )
            .slice(0, 10)
            .map(({ createdAt, ...user }) => ({
                ...user,
                initials: user.name
                    ? user.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()
                    : "—",
            }));

        const revenueByMonth = new Map(
            revenueRecords.map((record) => [
                `${record._id.year}-${record._id.month}`,
                record.value,
            ])
        );

        const revenue = [];

        for (let i = 0; i < 6; i++) {
            const date = new Date(
                now.getFullYear(),
                now.getMonth() - 5 + i,
                1
            );

            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;

            revenue.push({
                month: date.toLocaleString("en-US", {
                    month: "short",
                }),
                value: revenueByMonth.get(key) || 0,
            });
        }

        const totalActiveUsers =
            activeClients + activeTranslators;

        return res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalRevenue:
                        monthlyRevenue[0]?.total ?? 0,
                    activeUsers: totalActiveUsers,
                    jobsInProgress,
                    // No dispute model is currently confirmed.
                    openDisputes: null,
                },
                revenue,
                verification: pendingVerifications.map(
                    (translator) => ({
                        id: String(translator._id),
                        name: translator.fullName,
                        email: translator.email,
                        language:
                            translator.nativeLanguage || "—",
                        text: "Pending verification",
                        code: translator.fullName
                            ? translator.fullName
                                  .split(/\s+/)
                                  .slice(0, 2)
                                  .map((part) => part[0])
                                  .join("")
                                  .toUpperCase()
                            : "—",
                    })
                ),
                users: recentUsers,
                disputes: [],
                // No payout model is currently confirmed.
                payouts: null,
                meta: {
                    totalClients,
                    totalTranslators,
                    currency: "USD",
                },
            },
        });
    } catch (error) {
        console.error(
            "Admin dashboard error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load dashboard data.",
        });
    }
}; 