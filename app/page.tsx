"use client";

import { useState } from "react";

// Qiita APIからの返却データ型
interface QiitaItem {
	title: string;
	url: string;
	created_at: string;
	user: {
		id: string;
	};
}

export default function Home() {
	// 初期値の設定（1ヶ月前から今日まで）
	const today = new Date();
	const oneMonthAgo = new Date();
	oneMonthAgo.setMonth(today.getMonth() - 1);

	// 日付をYYYY-MM-DD形式で取得する関数
	const formatDateToString = (date: Date) => {
		return date.toISOString().split("T")[0];
	};

	// 状態管理
	const [startDate, setStartDate] = useState<string>(
		formatDateToString(oneMonthAgo),
	);
	const [endDate, setEndDate] = useState<string>(formatDateToString(today));
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [displayText, setDisplayText] = useState<string>("");

	// Qiita APIから投稿を取得する関数
	const fetchQiitaPosts = async () => {
		// 入力値のバリデーション
		if (!startDate || !endDate) {
			setError("開始日と終了日を指定してください。");
			return;
		}

		setIsLoading(true);
		setError(null);
		setDisplayText("");

		try {
			// クエリパラメータの構築
			const query = encodeURIComponent(
				`org:craftsman_software created:>=${startDate} created:<=${endDate}`,
			);
			const url = `https://qiita.com/api/v2/items?per_page=100&query=${query}`;

			// APIリクエスト実行
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`API エラー: ${response.status}`);
			}

			const data: QiitaItem[] = await response.json();

			// 日付をY年m月d日形式に変換する関数
			const formatDateToJapanese = (dateString: string) => {
				const date = new Date(dateString);
				const year = date.getFullYear();
				const month = date.getMonth() + 1; // getMonthは0から始まるため+1する
				const day = date.getDate();
				return `${year}年${month}月${day}日`;
			};

			// ユーザーIDでグループ化
			const groupedByUser = data.reduce(
				(acc, item) => {
					const userId = item.user.id;
					if (!acc[userId]) {
						acc[userId] = [];
					}
					acc[userId].push(item);
					return acc;
				},
				{} as Record<string, QiitaItem[]>,
			);

			// マークダウン形式のテキスト生成
			const text = Object.entries(groupedByUser)
				.map(([userId, items]) => {
					const itemsText = items
						.map(
							(item) =>
								`  - [${item.title}](${item.url}) ${formatDateToJapanese(item.created_at)}`,
						)
						.join("\n");
					return `- ${userId} (${items.length}件)\n${itemsText}`;
				})
				.join("\n");

			setDisplayText(text || "指定された期間に投稿はありませんでした。");
		} catch (err) {
			setError(
				`エラーが発生しました: ${err instanceof Error ? err.message : String(err)}`,
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen p-8 max-w-4xl mx-auto">
			<h1 className="text-2xl font-bold mb-6">Qiita組織投稿検索</h1>

			<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
					<div>
						<label htmlFor="start-date" className="block mb-2 font-medium">
							開始日
						</label>
						<input
							id="start-date"
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
							required
						/>
					</div>
					<div>
						<label htmlFor="end-date" className="block mb-2 font-medium">
							終了日
						</label>
						<input
							id="end-date"
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
							className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
							required
						/>
					</div>
				</div>

				<button
					type="button"
					onClick={fetchQiitaPosts}
					disabled={isLoading}
					className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
				>
					{isLoading ? "読み込み中..." : "投稿を検索"}
				</button>
			</div>

			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					{error}
				</div>
			)}

			<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-semibold">検索結果</h2>
					{displayText && (
						<button
							type="button"
							onClick={() => {
								navigator.clipboard.writeText(displayText);
								alert("コピーしました！");
							}}
							className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 rounded text-sm"
						>
							クリップボードにコピー
						</button>
					)}
				</div>
				<textarea
					value={displayText}
					readOnly
					className="w-full h-96 p-4 border rounded font-mono text-sm dark:bg-gray-700 dark:border-gray-600 whitespace-pre overflow-x-auto"
					placeholder="ここに検索結果が表示されます"
				/>
			</div>
		</div>
	);
}
