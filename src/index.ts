import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Being Human Ecommerce Agent",
		version: "1.0.0",
	});

	async init() {
		// Product search tool for Being Human
		this.server.tool(
			"search_products",
			{
				query: z.string().default("*").describe("Search query for products"),
				count: z.number().default(12).describe("Number of products to return"),
				sort_by: z.string().default("rank").describe("Sort products by field"),
				sort_dir: z.enum(["asc", "desc"]).default("desc").describe("Sort direction"),
				filter: z.string().optional().describe("Additional filters to apply"),
				offset: z.number().default(0).describe("Offset for pagination"),
			},
			async ({ query, count, sort_by, sort_dir, filter, offset }) => {
				try {
					// Build the search URL
					const searchUrl = new URL(
						"https://engine.kartmax.in/api/fast/search/v1/b32e2ffeb77fad04ec54cdf13b1677d2/plp-special"
					);
					
					// Set search parameters
					searchUrl.searchParams.set("count", count.toString());
					searchUrl.searchParams.set("sort_by", sort_by);
					searchUrl.searchParams.set("sort_dir", sort_dir);
					searchUrl.searchParams.set("query", query);
					searchUrl.searchParams.set("fieldspecials", "overall_stock_status~in-stock");
					
					// Add additional filters if provided
					let filterString = "overall_stock_status~in-stock";
					if (filter) {
						filterString += `&${filter}`;
					}
					searchUrl.searchParams.set("filter", filterString);
					
					// Add pagination offset
					if (offset > 0) {
						searchUrl.searchParams.set("offset", offset.toString());
					}

					// Make the API request with all required headers
					const response = await fetch(searchUrl.toString(), {
						method: "GET",
						headers: {
							"accept": "application/json, text/plain, */*",
							"accept-language": "en-GB,en;q=0.9",
							"cache-control": "no-cache",
							"country": "en-in",
							"customer_session": "5ada4b614bfa6cfffed4bcc02a285aac",
							"dnt": "1",
							"origin": "https://www.beinghumanclothing.com",
							"pragma": "no-cache",
							"priority": "u=1, i",
							"referer": "https://www.beinghumanclothing.com/",
							"sec-ch-ua": '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
							"sec-ch-ua-mobile": "?0",
							"sec-ch-ua-platform": '"Linux"',
							"sec-fetch-dest": "empty",
							"sec-fetch-mode": "cors",
							"sec-fetch-site": "cross-site",
							"user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
						}
					});

					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}

					const data = await response.json();
					
					// Format the response based on actual API structure
					const products = data.result?.products || [];
					
					const formattedResponse = {
						success: data.success,
						query: query,
						totalResults: data.totalHits || 0,
						resultsShown: products.length,
						currentPage: Math.floor(offset / count) + 1,
						hasMore: products.length === count,
						responseTime: data.responseTime,
						products: products.map((product: any) => ({
							id: product.id,
							sku: product.sku,
							name: product.name,
							groupId: product.group_id,
							subGroupId: product.sub_group_id,
							price: product.price,
							sellingPrice: product.selling_price,
							discount: product.discount,
							discountAmount: product.variation?.[0]?.discount_amount,
							brand: product.variation?.[0]?.brand || "Being Human Clothing",
							category: product._category?.[0] || "Unknown",
							color: product.colour,
							sizes: product._size || [],
							image: product.image ? `https://engine.kartmax.in/${product.image}` : null,
							gallery: product.gallery?.map((img: any) => ({
								image: `https://engine.kartmax.in/${img.image}`,
								position: img.position
							})) || [],
							url: `https://www.beinghumanclothing.com/${product.url_key}`,
							inStock: product.overall_stock_status === "in-stock",
							stockCount: product.overall_stock_count,
							description: product.description,
							featuredTag: product.featured_tag,
							fit: product.fit,
							neck: product.neck,
							colorOptions: product.color_options?.map((option: any) => ({
								color: option.colour,
								colorName: option.colour_name,
								image: `https://engine.kartmax.in/${option.image}`,
								url: `https://www.beinghumanclothing.com/${option.url_key}`
							})) || [],
							variations: product.variation?.map((variant: any) => ({
								id: variant.id,
								sku: variant.sku,
								size: variant.size,
								price: variant.price,
								sellingPrice: variant.selling_price,
								discount: variant.discount,
								discountAmount: variant.discount_amount,
								quantity: variant.quantity,
								stockStatus: variant.stock_status,
								url: `https://www.beinghumanclothing.com/${variant.url_key}`
							})) || []
						})),
						filters: data.result?.filters?.map((filter: any) => ({
							label: filter.filter_lable,
							isSort: filter.is_sort,
							options: filter.options?.map((option: any) => ({
								code: option.code,
								value: option.value,
								valueKey: option.value_key,
								index: option.index
							})) || []
						})) || [],
						sortOptions: data.result?.sort?.map((sort: any) => ({
							code: sort.code,
							label: sort.label
						})) || [],
						pagination: {
							currentOffset: offset,
							nextOffset: offset + count,
							prevOffset: Math.max(0, offset - count),
							hasNext: products.length === count,
							hasPrev: offset > 0
						}
					};

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(formattedResponse, null, 2)
							}
						]
					};

				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error searching products: ${error instanceof Error ? error.message : 'Unknown error'}`
							}
						]
					};
				}
			}
		);

		// Get categories tool for Being Human
		this.server.tool(
			"get_categories",
			{},
			async () => {
				try {
					const response = await fetch(
						"https://engine.kartmax.in/api/cart/v1/categories?site=null&url_key=&lg=en",
						{
							method: "GET",
							headers: {
								"accept": "*/*",
								"accept-language": "en-GB,en;q=0.9",
								"cache-control": "no-cache",
								"country_lan": "undefined",
								"dnt": "1",
								"origin": "https://www.beinghumanclothing.com",
								"pragma": "no-cache",
								"priority": "u=1, i",
								"referer": "https://www.beinghumanclothing.com/",
								"sec-ch-ua": '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
								"sec-ch-ua-mobile": "?0",
								"sec-ch-ua-platform": '"Linux"',
								"sec-fetch-dest": "empty",
								"sec-fetch-mode": "cors",
								"sec-fetch-site": "cross-site",
								"user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
							}
						}
					);

					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}

					const data = await response.json();
					
					// Format categories for better readability
					const formattedCategories = {
						categories: data.categories?.map((category: any) => ({
							id: category.id,
							name: category.name,
							urlKey: category.url_key,
							image: category.image,
							productCount: category.product_count || 0,
							url: `https://www.beinghumanclothing.com/${category.url_key}`
						})) || [],
						totalCategories: data.categories?.length || 0
					};

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(formattedCategories, null, 2)
							}
						]
					};

				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error fetching categories: ${error instanceof Error ? error.message : 'Unknown error'}`
							}
						]
					};
				}
			}
		);

		// Quick filter tool for common filtering scenarios
		this.server.tool(
			"quick_filter",
			{
				query: z.string().default("*").describe("Search query"),
				filterType: z.enum(["price_low_to_high", "price_high_to_low", "highest_discount", "new_arrivals", "under_1000", "1000_to_2000", "above_2000"]).describe("Quick filter type"),
				count: z.number().default(24).describe("Number of products to return"),
				offset: z.number().default(0).describe("Offset for pagination"),
			},
			async ({ query, filterType, count, offset }) => {
				let sort_by = "rank";
				let sort_dir: "asc" | "desc" = "desc";
				let filter = "";
				
				switch (filterType) {
					case "price_low_to_high":
						sort_by = "selling_price";
						sort_dir = "asc";
						break;
					case "price_high_to_low":
						sort_by = "selling_price";
						sort_dir = "desc";
						break;
					case "highest_discount":
						sort_by = "discount";
						sort_dir = "desc";
						break;
					case "new_arrivals":
						sort_by = "new_arrivals";
						sort_dir = "desc";
						break;
					case "under_1000":
						filter = "selling_price~0,1000";
						break;
					case "1000_to_2000":
						filter = "selling_price~1000,2000";
						break;
					case "above_2000":
						filter = "selling_price~2000,10000";
						break;
				}
				
				// Use the main search_products tool
				return await this.server.tools.search_products.handler({
					query,
					count,
					sort_by,
					sort_dir,
					filter: filter || undefined,
					offset,
					fieldspecials: "overall_stock_status~in-stock"
				});
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);
		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}
		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}
		return new Response("Not found", { status: 404 });
	},
};
