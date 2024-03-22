import {
  CreateConfigurationSetCommand,
  CreateConfigurationSetEventDestinationCommand,
  ListConfigurationSetsCommand,
  UpdateConfigurationSetEventDestinationCommand,
  UpdateConfigurationSetTrackingOptionsCommand,
} from '@aws-sdk/client-ses';
import { sesClient } from './ses';
import { logError } from './logger';
import { setupEmailFeedbackHandling } from './notification';
import { newId } from './new-id';

export async function createConfigurationSet() {
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
    const feedbackTopicArn = await setupEmailFeedbackHandling();
    console.log('-'.repeat(20));
    console.log('Feedback Topic ARN:', feedbackTopicArn);
    console.log('-'.repeat(20));
    if (!feedbackTopicArn) {
      throw new Error('Failed to setup email feedback handling');
    }

    const setConfigurationSetEventDestinationCommand =
      new CreateConfigurationSetEventDestinationCommand({
        ConfigurationSetName: configurationSetName,
        EventDestination: {
          Name: 'Feedback',
          Enabled: true,
          MatchingEventTypes: [
            'send',
            'reject',
            'bounce',
            'complaint',
            'delivery',
            'renderingFailure',
          ],
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

export async function setDefaultConfigurationSet(name: string, domain: string) {
  try {
    const setDefaultConfigurationSetCommand = '';
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return null;
  }
}

export async function updateConfigurationSetTrackingOptions(
  configurationSetName: string,
  redirectDomain: string,
) {
  try {
    const setTrackingOptionsCommand =
      new UpdateConfigurationSetTrackingOptionsCommand({
        ConfigurationSetName: configurationSetName,
        TrackingOptions: {
          CustomRedirectDomain: redirectDomain,
        },
      });

    const setTrackingOptionsResponse = await sesClient.send(
      setTrackingOptionsCommand,
    );
    if (!setTrackingOptionsResponse) {
      throw new Error('Failed to set tracking options');
    }

    return true;
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return false;
  }
}

export async function isConfirationSetExists(name: string) {
  try {
    const configurationSets = await listConfigutationSets();
    if (!configurationSets) {
      throw new Error('Failed to list configuration sets');
    }

    return configurationSets.has(name);
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return false;
  }
}

export async function listConfigutationSets() {
  try {
    const configurationSets = new Set<string>();
    let nextToken: string | undefined;

    do {
      const command = new ListConfigurationSetsCommand({
        NextToken: nextToken,
      });

      const response = await sesClient.send(command);
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
    return null;
  }
}
