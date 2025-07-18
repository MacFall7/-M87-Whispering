import { Err, tryAsync } from 'wellcrafted/result';
import { extractErrorMessage } from 'wellcrafted/error';
import type { HttpService } from '.';
import { ConnectionError, ResponseError, ParseError } from './types';

export function createHttpServiceWeb(): HttpService {
	return {
		async post({ body, url, schema, headers }) {
			const { data: response, error: responseError } = await tryAsync({
				try: () =>
					window.fetch(url, {
						method: 'POST',
						body,
						headers,
					}),
				mapError: (error) => ConnectionError({
					message: 'Failed to establish connection',
					context: { url, body, headers },
					cause: error,
				}),
			});
			if (responseError) return Err(responseError);

			if (!response.ok) {
				return Err(ResponseError({
					status: response.status,
					message: extractErrorMessage(await response.json()),
					context: { url, body, headers },
					cause: responseError,
				}));
			}

			const parseResult = await tryAsync({
				try: async () => {
					const json = await response.json();
					return schema.parse(json);
				},
				mapError: (error) => ParseError({
					message: 'Failed to parse response',
					context: { url, body, headers },
					cause: error,
				}),
			});
			return parseResult;
		},
	};
}
