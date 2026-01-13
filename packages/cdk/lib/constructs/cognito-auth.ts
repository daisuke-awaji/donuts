import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface CognitoAuthProps {
  /**
   * Cognito User Pool の名前
   */
  readonly userPoolName: string;

  /**
   * App Client の名前
   * デフォルト: "{userPoolName}-client"
   */
  readonly appClientName?: string;

  /**
   * パスワードポリシーの最小文字数
   * デフォルト: 8
   */
  readonly passwordMinLength?: number;

  /**
   * ユーザー削除保護の有効化
   * デフォルト: false (開発環境用)
   */
  readonly deletionProtection?: boolean;

  /**
   * User Pool の追加設定
   */
  readonly userPoolConfig?: {
    readonly mfa?: cognito.Mfa;
    readonly selfSignUpEnabled?: boolean;
    readonly autoVerify?: {
      email?: boolean;
      phone?: boolean;
    };
  };

  /**
   * 許可するメールドメインのリスト (オプション)
   * 設定した場合、これらのドメインのメールアドレスのみサインアップ可能
   * 例: ['amazon.com', 'amazon.jp']
   */
  readonly allowedSignUpEmailDomains?: string[];

  /**
   * テストユーザー設定 (オプション、開発環境用)
   * 設定した場合、デプロイ時にテストユーザーを自動作成
   */
  readonly testUser?: {
    readonly username: string;
    readonly email: string;
    readonly password: string;
  };

  /**
   * マシンユーザー（Client Credentials Flow）の有効化
   * バッチ処理用のサービスアカウント認証に使用
   * デフォルト: false
   */
  readonly enableMachineUser?: boolean;

  /**
   * Cognito Domain プレフィックス
   * マシンユーザー有効時に必須
   * 例: 'my-app-auth' -> 'my-app-auth.auth.{region}.amazoncognito.com'
   */
  readonly domainPrefix?: string;
}

/**
 * AgentCore用 Cognito User Pool + App Client Construct
 *
 * Gateway と Runtime で共有するCognito認証基盤を提供します。
 */
export class CognitoAuth extends Construct {
  /**
   * 作成されたUser Pool
   */
  public readonly userPool: cognito.UserPool;

  /**
   * 作成されたApp Client
   */
  public readonly userPoolClient: cognito.UserPoolClient;

  /**
   * OIDC Discovery URL
   * AgentCore のJWT authorizerで使用
   */
  public readonly discoveryUrl: string;

  /**
   * App Client ID
   * JWT token の client_id claim 検証で使用
   */
  public readonly clientId: string;

  /**
   * User Pool ID
   */
  public readonly userPoolId: string;

  /**
   * User Pool ARN
   */
  public readonly userPoolArn: string;

  /**
   * マシンユーザー用 App Client (Client Credentials Flow)
   * enableMachineUser: true の場合のみ作成
   */
  public readonly machineUserClient?: cognito.UserPoolClient;

  /**
   * マシンユーザー用 Client ID
   */
  public readonly machineUserClientId?: string;

  /**
   * Cognito Domain URL (マシンユーザー用トークンエンドポイント)
   */
  public readonly tokenEndpoint?: string;

  constructor(scope: Construct, id: string, props: CognitoAuthProps) {
    super(scope, id);

    // Pre Sign Up Lambda トリガー (メールドメイン検証用)
    let preSignUpTrigger: lambda.Function | undefined;
    if (props.allowedSignUpEmailDomains && props.allowedSignUpEmailDomains.length > 0) {
      preSignUpTrigger = new lambda.Function(this, 'PreSignUpTrigger', {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline(`
exports.handler = async (event) => {
  console.log('Pre Sign Up Trigger - Event:', JSON.stringify(event, null, 2));
  
  const allowedDomains = process.env.ALLOWED_DOMAINS?.split(',') || [];
  const email = event.request.userAttributes.email;
  
  if (!email) {
    throw new Error('Email is required for sign up');
  }
  
  const emailDomain = email.split('@')[1]?.toLowerCase();
  
  if (!emailDomain) {
    throw new Error('Invalid email format');
  }
  
  const isAllowed = allowedDomains.some(domain => 
    emailDomain === domain.toLowerCase()
  );
  
  if (!isAllowed) {
    console.log(\`Sign up denied: Email domain '\${emailDomain}' is not in allowed list: \${allowedDomains.join(', ')}\`);
    throw new Error(\`Sign up is restricted to the following email domains: \${allowedDomains.join(', ')}\`);
  }
  
  console.log(\`Sign up allowed: Email domain '\${emailDomain}' is in allowed list\`);
  
  // Auto-confirm the user
  event.response.autoConfirmUser = false;
  event.response.autoVerifyEmail = false;
  
  return event;
};
        `),
        environment: {
          ALLOWED_DOMAINS: props.allowedSignUpEmailDomains.join(','),
        },
        timeout: cdk.Duration.seconds(10),
        logRetention: logs.RetentionDays.ONE_WEEK,
      });
    }

    // User Pool 作成
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: props.userPoolName,

      // パスワードポリシー
      passwordPolicy: {
        minLength: props.passwordMinLength || 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },

      // MFA設定
      mfa: props.userPoolConfig?.mfa || cognito.Mfa.OFF,

      // セルフサインアップ
      selfSignUpEnabled: props.userPoolConfig?.selfSignUpEnabled ?? false,

      // 自動検証
      autoVerify: {
        email: props.userPoolConfig?.autoVerify?.email ?? false,
        phone: props.userPoolConfig?.autoVerify?.phone ?? false,
      },

      // サインイン設定
      signInAliases: {
        username: true,
        email: true,
        phone: false,
      },

      // 削除保護
      deletionProtection: props.deletionProtection ?? false,

      // カスタム属性なし（シンプルな構成）
      customAttributes: {},

      // アカウント復旧
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      // Lambda トリガー設定
      lambdaTriggers: preSignUpTrigger
        ? {
            preSignUp: preSignUpTrigger,
          }
        : undefined,
    });

    // App Client 作成
    this.userPoolClient = this.userPool.addClient('AppClient', {
      userPoolClientName: props.appClientName || `${props.userPoolName}-client`,

      // 認証フロー設定
      authFlows: {
        userPassword: true, // USER_PASSWORD_AUTH (必須)
        userSrp: true, // SRP認証を有効化
        adminUserPassword: true, // ADMIN_USER_PASSWORD_AUTH
        custom: false, // CUSTOM_AUTH無効
      },

      // OAuth設定を完全に削除（JWT認証には不要）

      // トークン有効期限
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),

      // セキュリティ設定
      generateSecret: false, // Public client (secret不要)
      preventUserExistenceErrors: true,
    });

    // プロパティ設定
    this.clientId = this.userPoolClient.userPoolClientId;
    this.userPoolId = this.userPool.userPoolId;
    this.userPoolArn = this.userPool.userPoolArn;

    // OIDC Discovery URL 構築
    const region = cdk.Stack.of(this).region;
    this.discoveryUrl = `https://cognito-idp.${region}.amazonaws.com/${this.userPoolId}/.well-known/openid-configuration`;

    // マシンユーザー（Client Credentials Flow）の設定
    if (props.enableMachineUser) {
      this.setupMachineUserAuth(props.domainPrefix, region);
    }

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${cdk.Stack.of(this).stackName}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.clientId,
      description: 'Cognito User Pool App Client ID',
      exportName: `${cdk.Stack.of(this).stackName}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, 'DiscoveryUrl', {
      value: this.discoveryUrl,
      description: 'OIDC Discovery URL for JWT authentication',
      exportName: `${cdk.Stack.of(this).stackName}-DiscoveryUrl`,
    });

    // テストユーザーの作成（設定されている場合のみ）
    if (props.testUser) {
      this.createTestUser(props.testUser);
    }
  }

  /**
   * テストユーザーを作成する
   */
  private createTestUser(testUser: { username: string; email: string; password: string }): void {
    // ユーザー作成用の AwsCustomResource
    const createUser = new cr.AwsCustomResource(this, 'CreateTestUser', {
      onCreate: {
        service: 'CognitoIdentityServiceProvider',
        action: 'adminCreateUser',
        parameters: {
          UserPoolId: this.userPoolId,
          Username: testUser.username,
          UserAttributes: [
            {
              Name: 'email',
              Value: testUser.email,
            },
            {
              Name: 'email_verified',
              Value: 'true',
            },
          ],
          MessageAction: 'SUPPRESS', // Welcome email を送信しない
        },
        physicalResourceId: cr.PhysicalResourceId.of(`test-user-${testUser.username}`),
      },
      onUpdate: {
        service: 'CognitoIdentityServiceProvider',
        action: 'adminCreateUser',
        parameters: {
          UserPoolId: this.userPoolId,
          Username: testUser.username,
          UserAttributes: [
            {
              Name: 'email',
              Value: testUser.email,
            },
            {
              Name: 'email_verified',
              Value: 'true',
            },
          ],
          MessageAction: 'SUPPRESS',
        },
        physicalResourceId: cr.PhysicalResourceId.of(`test-user-${testUser.username}`),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['cognito-idp:AdminCreateUser'],
          resources: [this.userPoolArn],
        }),
      ]),
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // パスワード設定用の AwsCustomResource
    const setPassword = new cr.AwsCustomResource(this, 'SetTestUserPassword', {
      onCreate: {
        service: 'CognitoIdentityServiceProvider',
        action: 'adminSetUserPassword',
        parameters: {
          UserPoolId: this.userPoolId,
          Username: testUser.username,
          Password: testUser.password,
          Permanent: true, // パスワード変更不要
        },
        physicalResourceId: cr.PhysicalResourceId.of(`test-user-password-${testUser.username}`),
      },
      onUpdate: {
        service: 'CognitoIdentityServiceProvider',
        action: 'adminSetUserPassword',
        parameters: {
          UserPoolId: this.userPoolId,
          Username: testUser.username,
          Password: testUser.password,
          Permanent: true,
        },
        physicalResourceId: cr.PhysicalResourceId.of(`test-user-password-${testUser.username}`),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['cognito-idp:AdminSetUserPassword'],
          resources: [this.userPoolArn],
        }),
      ]),
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // パスワード設定はユーザー作成後に実行
    setPassword.node.addDependency(createUser);

    // CloudFormation Output でテストユーザー情報を出力
    new cdk.CfnOutput(this, 'TestUserUsername', {
      value: testUser.username,
      description: 'Test user username',
    });

    new cdk.CfnOutput(this, 'TestUserEmail', {
      value: testUser.email,
      description: 'Test user email',
    });
  }

  /**
   * JWT token 検証用のパラメータを取得
   * AgentCore Runtime の authorizerConfiguration で使用
   */
  public getJwtAuthorizerConfig(): {
    discoveryUrl: string;
    allowedClients: string[];
  } {
    const allowedClients = [this.clientId];
    if (this.machineUserClientId) {
      allowedClients.push(this.machineUserClientId);
    }
    return {
      discoveryUrl: this.discoveryUrl,
      allowedClients,
    };
  }

  /**
   * マシンユーザー（Client Credentials Flow）用の認証設定を作成
   */
  private setupMachineUserAuth(domainPrefix: string | undefined, region: string): void {
    if (!domainPrefix) {
      throw new Error('domainPrefix is required when enableMachineUser is true');
    }

    // Cognito Domain の作成（OAuth2 トークンエンドポイント用）
    this.userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: domainPrefix,
      },
    });

    // リソースサーバーの作成（カスタムスコープ定義）
    const resourceServer = this.userPool.addResourceServer('AgentCoreResourceServer', {
      identifier: 'agentcore',
      scopes: [
        {
          scopeName: 'batch.execute',
          scopeDescription: 'Execute agent as batch process with targetUserId',
        },
      ],
    });

    // マシンユーザー用 App Client（Client Credentials Flow）
    this.machineUserClient = this.userPool.addClient('MachineUserClient', {
      userPoolClientName: `${this.userPool.userPoolName}-machine-client`,

      // Client Credentials Flow のみ有効化
      authFlows: {
        userPassword: false,
        userSrp: false,
        adminUserPassword: false,
        custom: false,
      },

      // OAuth設定（Client Credentials Flow）
      oAuth: {
        flows: {
          clientCredentials: true,
        },
        scopes: [cognito.OAuthScope.custom('agentcore/batch.execute')],
      },

      // トークン有効期限
      accessTokenValidity: cdk.Duration.hours(1),

      // Client Secret が必要（Client Credentials Flow では必須）
      generateSecret: true,

      // セキュリティ設定
      preventUserExistenceErrors: true,
    });

    // リソースサーバーへの依存関係を明示
    this.machineUserClient.node.addDependency(resourceServer);

    // プロパティ設定
    this.machineUserClientId = this.machineUserClient.userPoolClientId;
    this.tokenEndpoint = `https://${domainPrefix}.auth.${region}.amazoncognito.com/oauth2/token`;

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'MachineUserClientId', {
      value: this.machineUserClientId,
      description: 'Machine User App Client ID (for Client Credentials Flow)',
      exportName: `${cdk.Stack.of(this).stackName}-MachineUserClientId`,
    });

    new cdk.CfnOutput(this, 'TokenEndpoint', {
      value: this.tokenEndpoint,
      description: 'OAuth2 Token Endpoint for Machine User',
      exportName: `${cdk.Stack.of(this).stackName}-TokenEndpoint`,
    });

    // Note: Client Secret は Secrets Manager で管理することを推奨
    // ここでは CloudFormation Output に含めない（セキュリティ上の理由）
  }
}
