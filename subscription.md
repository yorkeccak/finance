I need to add a subscription to the app. There are a few components to this:

- I want 2 options, first is a fully pay-per-use model, where the user pays for exactly the cost incurred (with 20% margin), this is for ai model input/output tokens + tool call cost (valyu + daytona). The second is a $200pm subscription, where the user has unlimited access to everything. simple.
- this will obviously require a login, so we need a way for people to signup and login. I want it to be oauth based with google, or email password. We will use supabase for this as it is easy to integrate with.
- We will need a way to store chat history, we wil use  for this, allowing users to see all previous chats and continue the conversations effortlessly.
- We will obviously need a way to manage subscriptions etc, i want to use polars for this, as it is super easy to add normal saas subscription, but also to meter llm usage with ai sdk.
- for any email based stuff we may need, i use resend.
- Will need basic settings dropdown or smth where people can manage subscriptions, see profile, etc, but want this to be super lightweight and not take up too much space.
- The cta when the rate limit opens in APP_MODE production will try and get people to upgrade to a plan, or funnel people to be a user of the valyu api

Docs for llm metering:

# LLM Strategy

> Ingestion strategy for LLM Usage

## Javascript SDK

### LLM Strategy

Wrap any LLM model from the `@ai-sdk/*` library, to automatically fire prompt- & completion tokens used by every model call.

```
pnpm add @polar-sh/ingestion ai @ai-sdk/openai
```

```typescript
import { Ingestion } from "@polar-sh/ingestion";
import { LLMStrategy } from "@polar-sh/ingestion/strategies/LLM";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// Setup the LLM Ingestion Strategy
const llmIngestion = Ingestion({ accessToken: process.env.POLAR_ACCESS_TOKEN })
  .strategy(new LLMStrategy(openai("gpt-4o")))
  .ingest("openai-usage");

export async function POST(req: Request) {
  const { prompt }: { prompt: string } = await req.json();

  // Get the wrapped LLM model with ingestion capabilities
  // Pass Customer Id to properly annotate the ingestion events with a specific customer
  const model = llmIngestion.client({
    customerId: request.headers.get("X-Polar-Customer-Id") ?? "",
  });

  const { text } = await generateText({
    model,
    system: "You are a helpful assistant.",
    prompt,
  });

  return Response.json({ text });
}
```

#### Ingestion Payload

```json
{
  "customerId": "123",
  "name": "openai-usage",
  "metadata": {
    "promptTokens": 100,
    "completionTokens": 200
  }
}
```

## Python SDK

Our Python SDK includes an ingestion helper and strategies for common use cases. It's installed as part of the Polar SDK.

<CodeGroup>
  ```bash pip
  pip install polar-sdk
  ```

  ```bash uv
  uv add polar-sdk
  ```
</CodeGroup>

### Ingestion helper

The ingestion helper is a simple wrapper around the Polar events ingestion API. It takes care of batching and sending events to Polar in the background, without blocking your main thread.

```python
import os
from polar_sdk.ingestion import Ingestion

ingestion = Ingestion(os.getenv("POLAR_ACCESS_TOKEN"))

ingestion.ingest({
    "name": "my-event",
    "external_customer_id": "CUSTOMER_ID",
    "metadata": {
        "usage": 13.37,
    }
})
```

### PydanticAI Strategy

[PydanticAI](https://ai.pydantic.dev) is an AI agent framework for Python. A common use-case with AI applications is to track the usage of LLMs, like the number of input and output tokens, and bill the customer accordingly.

With our PydanticAI strategy, you can easily track the usage of LLMs and send the data to Polar for billing.

```python
import os
from polar_sdk.ingestion import Ingestion
from polar_sdk.ingestion.strategies import PydanticAIStrategy
from pydantic import BaseModel
from pydantic_ai import Agent


ingestion = Ingestion(os.getenv("POLAR_ACCESS_TOKEN"))
strategy = ingestion.strategy(PydanticAIStrategy, "ai_usage")


class MyModel(BaseModel):
    city: str
    country: str


agent = Agent("gpt-4.1-nano", output_type=MyModel)

if __name__ == '__main__':
    result = agent.run_sync("The windy city in the US of A.")
    print(result.output)
    strategy.ingest("CUSTOMER_ID", result)
```

*This example is inspired from the [Pydantic Model example](https://ai.pydantic.dev/examples/pydantic-model/) of PydanticAI documentation.*

#### Ingestion Payload

```json
{
  "name": "ai_usage",
  "external_customer_id": "CUSTOMER_ID",
  "metadata": {
    "requests": 1,
    "total_tokens": 78,
    "request_tokens": 58,
    "response_tokens": 20
  }
}
```

docs for metering:

# Meters

> Creating and managing meters for Usage Based Billing

Meters are there to filter and aggregate the events that are ingested. Said another way, this is how you define what usage you want to charge for, based on the events you send to Polar. For example:

* AI usage meter, which filters the events with the name `ai_usage` and sums the `total_tokens` field.
* Video streaming meter, which filters the events with the name `video_streamed` and sums the `duration` field.
* File upload meter, which filters the events with the name `file_uploaded` and sums the `size` field.

You can create and manage your meters from the dashboard. Polar is then able to compute the usage over time, both globally and per customer.

## Creating a Meter

To create a meter, navigate to the Meters page in the sidebar and click the "Create Meter" button.

<img className="block dark:hidden" src="https://mintlify.s3.us-west-1.amazonaws.com/polar/assets/features/usage/create-meter.light.png" />

<img className="hidden dark:block" src="https://mintlify.s3.us-west-1.amazonaws.com/polar/assets/features/usage/create-meter.dark.png" />

## Filters

A filter is a set of clauses that are combined using conjunctions. They're used to filter events that you've ingested into Polar.

<img className="block dark:hidden" src="https://mintlify.s3.us-west-1.amazonaws.com/polar/assets/features/usage/filter.light.png" />

<img className="hidden dark:block" src="https://mintlify.s3.us-west-1.amazonaws.com/polar/assets/features/usage/filter.dark.png" />

### Clauses

A clause is a condition that an event must meet to be included in the meter.

#### Property

Properties are the properties of the event that you want to filter on.

If you want to match on a metadata field, you can use the metadata key directly. No need to include a `metadata.` prefix.

#### Operator

Operators are the operators that you want to use to filter the events.

* **Equals**
* **Not equals**
* **Greater Than**
* **Greater Than or Equals**
* **Less Than**
* **Less Than or Equals**
* **Contains**
* **Does Not Contain**

#### Value

Values are automatically parsed in the filter builder. They're parsed in the following order:

1. Number — Tries to parse the value as number
2. Boolean — Checks if value is "true" or "false"
3. String — Treats value as string as fallback

### Conjunctions

A conjunction is a logical operator that combines two or more clauses.

* **and** — All clauses must be true for the event to be included.
* **or** — At least one clause must be true for the event to be included.

## Aggregation

The aggregation is the function that is used to aggregate the events that match the filter.

For example, if you want to count the number of events that match the filter, you can use the **Count** aggregation. If you want to sum the value of a metadata field, you can use the **Sum** aggregation.

* **Count** — Counts the number of events that match the filter.
* **Sum** — Sums the value of a property.
* **Average** — Computes the average value of a property.
* **Minimum** — Computes the minimum value of a property.
* **Maximum** — Computes the maximum value of a property.

<AccordionGroup>
  <Accordion title="Example">
    Consider the following events:

    ```json
    [
      {
        "name": "ai_usage",
        "external_customer_id": "cus_123",
        "metadata": {
          "total_tokens": 10
        }
      },
      {
        "name": "ai_usage",
        "external_customer_id": "cus_123",
        "metadata": {
          "total_tokens": 20
        }
      },
      {
        "name": "ai_usage",
        "external_customer_id": "cus_123",
        "metadata": {
          "total_tokens": 30
        }
      }
    ]
    ```

    Here is the result of each aggregation function, over the `total_tokens` metadata property:

    * **Count**: 3 units
    * **Sum**: 60 units
    * **Average**: 20 units
    * **Minimum**: 10 units
    * **Maximum**: 30 units
  </Accordion>
</AccordionGroup>

If you want to use a metadata property in the aggregation, you can use the metadata property directly. No need to include a `metadata.` prefix.

## Example

The following Meter Filter & Aggregation will match events that have the name `openai-usage` and sum units over metadata property `completionTokens`.

<img className="block dark:hidden" src="https://mintlify.s3.us-west-1.amazonaws.com/polar/assets/features/usage/meter.light.png" />

<img className="hidden dark:block" src="https://mintlify.s3.us-west-1.amazonaws.com/polar/assets/features/usage/meter.dark.png" />

<Tip>
  You can **Preview** the events matched by the meter while creating it.
</Tip>

## Good to know

A few things to keep in mind when creating and managing meters:

### Renaming a Meter

Until [https://github.com/polarsource/polar/issues/6490](https://github.com/polarsource/polar/issues/6490) is resolved, please [contact support](/support) to help you with renaming the meter.

### Updating a Meter

You may update a meter's filters or aggregation function as long as the meter doesn't have any processed events.

### Deleting a Meter

Meters are permanent. Once created, they cannot be deleted.

Usage Billing with Meters
Meters are aggregated filters on ingested events. They are used to calculate your customer's usage of whatever you choose to measure.

For example, if you want to measure the number of API calls your customer makes, you can create a meter that counts the number of events with an arbitrary name like api_call.

import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
  accessToken: process.env["POLAR_ACCESS_TOKEN"] ?? "",
});

export const GET = async (req: Request, res: Response) => {
  await polar.events.ingest({
    events: [
      {
        name: "api_call",
        // Replace with your logic to get the customer id
        externalCustomerId: req.ctx.customerId,
        metadata: {
          route: "/api/metered-route",
          method: "GET",
        },
      },
    ],
  });

  return new Response({ hello: 'world' })
}

polar checkout:

# Checkout Links

> Sell your digital products with ease by sharing a checkout link to select products

Checkout links can be shared or linked on your website which automatically
creates a checkout session for customers.

<Tip>
  Looking for a way to generate Checkout session programmatically? Checkout
  Links might not be the right tool for you. Instead, you should use the
  [Checkout API](/features/checkout/session).
</Tip>

## Create a Checkout Link

Checkout Links can be managed from the **Checkout Links** tabs of the Products section. Click on **New Link** to create a new one.

<Frame>
  <img className="block dark:hidden" src="https://mintlify.s3.us-west-1.amazonaws.com/polar/assets/features/checkout/links/create.light.png" />

  <img className="hidden dark:block" src="https://mintlify.s3.us-west-1.amazonaws.com/polar/assets/features/checkout/links/create.dark.png" />
</Frame>

#### Label

This is an internal name for the Checkout Link. It's only visible to you.

#### Products

You can select one or **several** products. With several products, customers will be able to switch between them on the checkout page.

<img className="block dark:hidden" src="https://mintlify.s3.us-west-1.amazonaws.com/polar/assets/features/checkout/links/checkout_multiple_products.light.png" />

<img className="hidden dark:block" src="https://mintlify.s3.us-west-1.amazonaws.com/polar/assets/features/checkout/links/checkout_multiple_products.dark.png" />

#### Discount

You can disable discount codes, if you wish to prevent customers from using them.

You can also preset a discount: it'll be automatically applied when the customer lands on the checkout page.

#### Metadata

This is an optional key-value object allowing you to store additional information which may be useful for you when handling the order. This metadata will be copied to the generated Checkout object and, if the checkout succeeds, to the resulting Order and/or Subscription.

## Using Checkout Links

You can share the Checkout Link URL on your webpage, social media, or directly to customers.

<img className="block dark:hidden" src="https://mintlify.s3.us-west-1.amazonaws.com/polar/assets/features/checkout/links/checkout_link.light.png" />

<img className="hidden dark:block" src="https://mintlify.s3.us-west-1.amazonaws.com/polar/assets/features/checkout/links/checkout_link.dark.png" />

<Warning>
  Checkout Links will go against our API, and redirect to short-lived Checkout session. This means that the Checkout page the user will end up on, are temporary and expires after a while if no successful purchase is made.

  This means that you need to make sure to always use this Checkout Link URL (as shown above). If you mistakenly copy the URL from a Checkout Session, the link will expire.
</Warning>

### Query parameters

You can pass optional query parameters to your Checkout Links.

#### Prepopulate fields

You can prefill the checkout fields with the following query parameters:

<ParamField path="customer_email" type="string">
  Prefill customer email at checkout
</ParamField>

<ParamField path="customer_name" type="string">
  Prefill customer name at checkout
</ParamField>

<ParamField path="discount_code" type="string">
  Prefill discount code
</ParamField>

<ParamField path="amount" type="string">
  Prefill amount in case of Pay What You Want pricing
</ParamField>

<ParamField path="custom_field_data.{slug}" type="string">
  Prefill checkout fields data, where `{slug}` is the slug of the custom field.
</ParamField>

#### Store attribution and reference metadata

The following query parameters will automatically be set on Checkout [`metadata`](/api-reference/checkouts/get-session#response-metadata).

<ParamField path="reference_id" type="string">
  Your own reference ID for the checkout session.
</ParamField>

<ParamField path="utm_source" type="string">
  UTM source of the checkout session.
</ParamField>

<ParamField path="utm_medium" type="string">
  UTM medium of the checkout session.
</ParamField>

<ParamField path="utm_campaign" type="string">
  UTM campaign of the checkout session.
</ParamField>

<ParamField path="utm_content" type="string">
  UTM content of the checkout session.
</ParamField>

<ParamField path="utm_term" type="string">
  UTM term of the checkout session.
</ParamField>
