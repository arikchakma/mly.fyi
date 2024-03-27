import {
  ConfigurationSetDoesNotExistException,
  CreateConfigurationSetCommand,
  CreateConfigurationSetEventDestinationCommand,
  CreateConfigurationSetTrackingOptionsCommand,
  EventDestinationAlreadyExistsException,
  InvalidSNSDestinationException,
  InvalidTrackingOptionsException,
  ListConfigurationSetsCommand,
  SESClient,
  SESServiceException,
  UpdateConfigurationSetEventDestinationCommand,
} from '@aws-sdk/client-ses';
import { logError } from './logger';
import { setupEmailFeedbackHandling } from './notification';
import { newId } from './new-id';
import type { SNSClient } from '@aws-sdk/client-sns';
import { HttpError } from './http-error';

const EVENT_DESTINATION_NAME = 'Feedback';
const DEFAULT_EVENT_TYPES = [
  'send',
  'reject',
  'bounce',
  'complaint',
  'delivery',
  'renderingFailure',
] as const;

export async function createConfigurationSet(
  sesClient: SESClient,
  snsClient: SNSClient,
) {
  try {
    const configurationSetName = newId('configurationSet');

    const createSetcommand = new CreateConfigurationSetCommand({
      ConfigurationSet: {
        Name: configurationSetName,
      },
    });

    const createSetResponse = await sesClient.send(createSetcommand);
    if (!createSetResponse) {
      throw new Error('Failed to create configuration set');
    }

    // Now we need to create a rule set for this configuration set
    // to handle feedbacks using SNS topic
    const feedbackTopicArn = await setupEmailFeedbackHandling(snsClient);
    if (!feedbackTopicArn) {
      throw new Error('Failed to setup email feedback handling');
    }

    const setConfigurationSetEventDestinationCommand =
      new CreateConfigurationSetEventDestinationCommand({
        ConfigurationSetName: configurationSetName,
        EventDestination: {
          Name: EVENT_DESTINATION_NAME,
          Enabled: true,
          MatchingEventTypes: [...DEFAULT_EVENT_TYPES],
          SNSDestination: {
            TopicARN: feedbackTopicArn,
          },
        },
      });

    const setEventDestinationResponse = await sesClient.send(
      setConfigurationSetEventDestinationCommand,
    );
    if (!setEventDestinationResponse) {
      throw new Error('Failed to set event destination');
    }

    return configurationSetName;
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return null;
  }
}

export async function createConfigurationSetTrackingOptions(
  client: SESClient,
  configurationSetName: string,
  redirectDomain: string,
) {
  try {
    const setTrackingOptionsCommand =
      new CreateConfigurationSetTrackingOptionsCommand({
        ConfigurationSetName: configurationSetName,
        TrackingOptions: {
          CustomRedirectDomain: redirectDomain,
        },
      });

    await client.send(setTrackingOptionsCommand);

    return true;
  } catch (error) {
    logError(error, (error as Error)?.stack);
    if (error instanceof ConfigurationSetDoesNotExistException) {
      throw new HttpError('bad_request', 'Configuration set does not exist');
    } else if (error instanceof InvalidTrackingOptionsException) {
      throw new HttpError('bad_request', 'Invalid tracking options');
    } else if (error instanceof SESServiceException) {
      if (error.name === 'TrackingOptionsAlreadyExists') {
        throw new HttpError('bad_request', 'Tracking options already exists');
      } else {
        throw new HttpError(
          'internal_error',
          error?.message || 'Failed to create tracking options',
        );
      }
    }

    return false;
  }
}

export type SetEventType = 'open' | 'click';

export async function updateConfigurationSetEvent(
  sesClient: SESClient,
  snsClient: SNSClient,
  configurationSetName: string,
  events: SetEventType[],
) {
  try {
    const topicArn = await setupEmailFeedbackHandling(snsClient);
    if (!topicArn) {
      throw new Error('Failed to setup email feedback handling');
    }

    const updateConfigurationSetEventDestinationCommand =
      new UpdateConfigurationSetEventDestinationCommand({
        ConfigurationSetName: configurationSetName,
        EventDestination: {
          Name: EVENT_DESTINATION_NAME,
          Enabled: true,
          MatchingEventTypes: [...DEFAULT_EVENT_TYPES, ...events],
          SNSDestination: {
            TopicARN: topicArn,
          },
        },
      });

    await sesClient.send(updateConfigurationSetEventDestinationCommand);
    return true;
  } catch (error) {
    logError(error, (error as Error)?.stack);
    if (error instanceof ConfigurationSetDoesNotExistException) {
      throw new HttpError('bad_request', 'Configuration set does not exist');
    } else if (error instanceof EventDestinationAlreadyExistsException) {
      throw new HttpError('bad_request', 'Event destination already exists');
    } else if (error instanceof InvalidSNSDestinationException) {
      throw new HttpError('bad_request', 'Invalid SNS destination');
    } else if (error instanceof SESServiceException) {
      throw new HttpError(
        'internal_error',
        error?.message || 'Failed to update event destination',
      );
    }

    return false;
  }
}

export async function isConfirationSetExists(client: SESClient, name: string) {
  try {
    const configurationSets = await listConfigutationSets(client);
    if (!configurationSets) {
      throw new Error('Failed to list configuration sets');
    }

    return configurationSets.has(name);
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return false;
  }
}

export async function listConfigutationSets(client: SESClient) {
  try {
    const configurationSets = new Set<string>();
    let nextToken: string | undefined;

    do {
      const command = new ListConfigurationSetsCommand({
        NextToken: nextToken,
      });

      const response = await client.send(command);
      if (response) {
        response.ConfigurationSets?.forEach((configurationSet) => {
          configurationSets.add(configurationSet?.Name || '');
        });

        nextToken = response.NextToken;
      } else {
        nextToken = undefined;
      }
    } while (nextToken);

    return configurationSets;
  } catch (error) {
    logError(error, (error as Error)?.stack);
    if (error instanceof SESServiceException) {
      throw new HttpError(
        'internal_error',
        error?.message || 'Failed to check configuration set',
      );
    }
    return null;
  }
}
