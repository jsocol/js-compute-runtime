#!/usr/bin/env node

import { $ as zx } from 'zx'

const startTime = Date.now();

zx.verbose = false;
if (process.env.FASTLY_API_TOKEN === undefined) {
    try {
        process.env.FASTLY_API_TOKEN = String(await zx`fastly profile token --quiet`).trim()
    } catch {
        console.error('No environment variable named FASTLY_API_TOKEN has been set and no default fastly profile exists.');
        console.error('In order to run the tests, either create a fastly profile using `fastly profile create` or export a fastly token under the name FASTLY_API_TOKEN');
        process.exit(1)
    }
}

async function setupConfigStores() {
    let stores = await (async function() {
        try {
            return JSON.parse(await zx`fastly config-store list --quiet --json --token $FASTLY_API_TOKEN`)
        } catch {
            return []
        }
    }())

    let STORE_ID = stores.find(({ name }) => name === 'aZ1 __ 2')?.id
    if (!STORE_ID) {
        process.env.STORE_ID = JSON.parse(await zx`fastly config-store create --quiet --name='aZ1 __ 2' --json --token $FASTLY_API_TOKEN`).id
    } else {
        process.env.STORE_ID = STORE_ID;
    }
    await zx`echo -n 'https://twitter.com/fastly' | fastly config-store-entry update --upsert --key twitter --store-id=$STORE_ID --stdin --token $FASTLY_API_TOKEN`
    await zx`fastly resource-link create --version latest --resource-id $STORE_ID --token $FASTLY_API_TOKEN --autoclone`

    STORE_ID = stores.find(({ name }) => name === 'testconfig')?.id
    if (!STORE_ID) {
        process.env.STORE_ID = JSON.parse(await zx`fastly config-store create --quiet --name='testconfig' --json --token $FASTLY_API_TOKEN`).id
    } else {
        process.env.STORE_ID = STORE_ID;
    }
    await zx`echo -n 'https://twitter.com/fastly' | fastly config-store-entry update --upsert --key twitter --store-id=$STORE_ID --stdin --token $FASTLY_API_TOKEN`
    await zx`fastly resource-link create --version latest --resource-id $STORE_ID --token $FASTLY_API_TOKEN --autoclone`
}

async function setupKVStore() {
    let stores = await (async function() {
        try {
            return JSON.parse(await zx`fastly kv-store list --quiet --json --token $FASTLY_API_TOKEN`)
        } catch {
            return []
        }
    }())

    const STORE_ID = stores.Data.find(({ Name }) => Name === 'example-test-kv-store')?.StoreID
    if (!STORE_ID) {
        process.env.STORE_ID = JSON.parse(await zx`fastly kv-store create --quiet --name='example-test-kv-store' --json --token $FASTLY_API_TOKEN`).id
    } else {
        process.env.STORE_ID = STORE_ID;
    }
    await zx`fastly resource-link create --version latest --resource-id $STORE_ID --token $FASTLY_API_TOKEN --autoclone`
}

async function setupSecretStore() {
    let stores = await (async function() {
        try {
            return JSON.parse(await zx`fastly secret-store list --quiet --json --token $FASTLY_API_TOKEN`)
        } catch {
            return []
        }
    }())
    const STORE_ID = stores.find(({ name }) => name === 'example-test-secret-store')?.id
    if (!STORE_ID) {
        process.env.STORE_ID = JSON.parse(await zx`fastly secret-store create --quiet --name=example-test-secret-store --json --token $FASTLY_API_TOKEN`).id
    } else {
        process.env.STORE_ID = STORE_ID;
    }
    await zx`echo -n 'This is also some secret data' | fastly secret-store-entry create --recreate-allow --name first --store-id=$STORE_ID --stdin --token $FASTLY_API_TOKEN`
    let key = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    await zx`echo -n 'This is some secret data' | fastly secret-store-entry create --recreate-allow --name ${key} --store-id=$STORE_ID --stdin --token $FASTLY_API_TOKEN`
    await zx`fastly resource-link create --version latest --resource-id $STORE_ID --token $FASTLY_API_TOKEN --autoclone`
}

await setupConfigStores()
await setupKVStore()
await setupSecretStore()

await zx`fastly service-version activate --version latest --token $FASTLY_API_TOKEN`

console.log(`Set up has finished! Took ${(Date.now() - startTime) / 1000} seconds to complete`);
